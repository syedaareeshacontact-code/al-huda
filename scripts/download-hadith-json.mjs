#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const API_BASE_URL = process.env.HADITH_API_BASE_URL || 'https://hadithapi.com/api';
const DEFAULT_OUTPUT_DIR = resolve('src/data/hadith-api');
const PER_PAGE = 200;
const CONCURRENCY = 2;
const REQUEST_INTERVAL_MS = 2_000;
const MAX_ATTEMPTS = 6;

let nextRequestAt = 0;

function readEnvKey() {
  if (process.env.HADITH_API_KEY) return process.env.HADITH_API_KEY.trim();

  return readFile('.env', 'utf8')
    .then((contents) => {
      const match = contents.match(/^HADITH_API_KEY=(.*)$/m);
      return match?.[1]?.trim() || '';
    })
    .catch(() => '');
}

function apiUrl(endpoint, apiKey) {
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${API_BASE_URL}${endpoint}${separator}apiKey=${encodeURIComponent(apiKey)}`;
}

async function fetchJson(endpoint, apiKey) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const now = Date.now();
      const requestAt = Math.max(now, nextRequestAt);
      nextRequestAt = requestAt + REQUEST_INTERVAL_MS;
      if (requestAt > now) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, requestAt - now));
      }

      const response = await fetch(apiUrl(endpoint, apiKey), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      });
      const text = await response.text();

      if (!response.ok) {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
        const error = new Error(`${response.status} ${response.statusText}: ${text.slice(0, 180)}`);
        error.retryAfterMs = Number.isFinite(retryAfterMs) ? retryAfterMs : 0;
        throw error;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Provider returned non-JSON (${response.headers.get('content-type') || 'unknown'}): ${text.slice(0, 180)}`);
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_ATTEMPTS) {
        const retryAfterMs = Number(lastError.retryAfterMs) || 0;
        const backoffMs = Math.max(retryAfterMs, lastError.message.startsWith('429 ') ? 10_000 : 1000 * attempt);
        console.warn(`${endpoint}: retrying in ${Math.ceil(backoffMs / 1000)}s (${attempt}/${MAX_ATTEMPTS})`);
        await new Promise((resolveDelay) => setTimeout(resolveDelay, backoffMs));
      }
    }
  }

  throw new Error(`${endpoint} failed after ${MAX_ATTEMPTS} attempts: ${lastError?.message}`);
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function mapConcurrent(items, worker, concurrency = CONCURRENCY) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function main() {
  const apiKey = await readEnvKey();
  if (!apiKey) {
    throw new Error('HADITH_API_KEY is missing. Set it in the environment or .env file.');
  }

  const outputArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
  const outputDir = resolve(outputArgument || DEFAULT_OUTPUT_DIR);
  const resume = process.argv.includes('--resume');
  const chaptersDir = join(outputDir, 'chapters');
  const hadithsDir = join(outputDir, 'hadiths');
  await Promise.all([
    mkdir(chaptersDir, { recursive: true }),
    mkdir(hadithsDir, { recursive: true }),
  ]);

  console.log('Downloading HadithAPI books…');
  const booksResponse = await fetchJson('/books', apiKey);
  if (!Array.isArray(booksResponse.books)) {
    throw new Error('HadithAPI books response did not contain a books array.');
  }
  await writeJson(join(outputDir, 'books.json'), booksResponse);

  const books = booksResponse.books;
  const archiveBooks = [];

  await mapConcurrent(books, async (book) => {
    const slug = book.bookSlug;
    console.log(`Downloading chapters: ${slug}`);
    const chaptersResponse = await fetchJson(`/${slug}/chapters`, apiKey);
    await writeJson(join(chaptersDir, `${slug}.json`), chaptersResponse);

    const hadithPath = join(hadithsDir, `${slug}.json`);
    const existing = resume ? await readJsonIfPresent(hadithPath) : null;
    if (existing?.hadiths && Array.isArray(existing.hadiths.data)) {
      console.log(`Reusing existing hadith archive: ${slug} (${existing.hadiths.data.length} records)`);
      archiveBooks.push({
        slug,
        bookName: book.bookName,
        requestedCount: Number(book.hadiths_count) || 0,
        downloadedCount: existing.hadiths.data.length,
        chapterCount: Array.isArray(chaptersResponse.chapters) ? chaptersResponse.chapters.length : 0,
        hadithFile: `hadiths/${slug}.json`,
        chapterFile: `chapters/${slug}.json`,
      });
      return;
    }

    if (!(Number(book.hadiths_count) > 0)) {
      console.log(`No hadith records advertised for ${slug}; creating an empty archive.`);
      const emptyResponse = {
        status: 200,
        message: 'No hadith records were advertised by HadithAPI when this archive was created.',
        book,
        hadiths: {
          current_page: 1,
          data: [],
          first_page_url: null,
          last_page: 1,
          last_page_url: null,
          next_page_url: null,
          prev_page_url: null,
          per_page: 0,
          total: 0,
          from: 0,
          to: 0,
        },
      };
      await writeJson(hadithPath, emptyResponse);
      archiveBooks.push({
        slug,
        bookName: book.bookName,
        requestedCount: 0,
        downloadedCount: 0,
        chapterCount: Array.isArray(chaptersResponse.chapters) ? chaptersResponse.chapters.length : 0,
        hadithFile: `hadiths/${slug}.json`,
        chapterFile: `chapters/${slug}.json`,
      });
      return;
    }

    const firstPage = await fetchJson(`/hadiths/?book=${encodeURIComponent(slug)}&paginate=${PER_PAGE}&page=1`, apiKey);
    const pagination = firstPage.hadiths;
    if (!pagination || !Array.isArray(pagination.data)) {
      throw new Error(`HadithAPI response for ${slug} did not contain hadiths.data.`);
    }

    const totalPages = Number(pagination.last_page) || 1;
    const pageNumbers = Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => index + 2);
    console.log(`Downloading hadiths: ${slug} (${pagination.total ?? pagination.data.length} records, ${totalPages} pages)`);

    const remainingPages = await mapConcurrent(pageNumbers, async (pageNumber) => {
      return fetchJson(
        `/hadiths/?book=${encodeURIComponent(slug)}&paginate=${PER_PAGE}&page=${pageNumber}`,
        apiKey
      );
    });

    const allHadiths = [pagination.data, ...remainingPages.map((page) => page.hadiths?.data || [])].flat();
    const hadithsResponse = {
      status: firstPage.status,
      message: firstPage.message,
      book: firstPage.book || book,
      hadiths: {
        ...pagination,
        current_page: 1,
        data: allHadiths,
        first_page_url: null,
        last_page: 1,
        last_page_url: null,
        next_page_url: null,
        prev_page_url: null,
        per_page: allHadiths.length,
        total: allHadiths.length,
        from: allHadiths.length ? 1 : 0,
        to: allHadiths.length,
      },
    };

    await writeJson(hadithPath, hadithsResponse);
    archiveBooks.push({
      slug,
      bookName: book.bookName,
      requestedCount: Number(book.hadiths_count) || 0,
      downloadedCount: allHadiths.length,
      chapterCount: Array.isArray(chaptersResponse.chapters) ? chaptersResponse.chapters.length : 0,
      hadithFile: `hadiths/${slug}.json`,
      chapterFile: `chapters/${slug}.json`,
    });
  });

  const downloadedAt = new Date().toISOString();
  await writeJson(join(outputDir, 'manifest.json'), {
    source: 'HadithAPI',
    sourceBaseUrl: API_BASE_URL,
    downloadedAt,
    perPage: PER_PAGE,
    booksFile: 'books.json',
    books: archiveBooks.sort((a, b) => a.slug.localeCompare(b.slug)),
  });

  const requested = archiveBooks.reduce((sum, book) => sum + book.requestedCount, 0);
  const downloaded = archiveBooks.reduce((sum, book) => sum + book.downloadedCount, 0);
  console.log(`Completed: ${downloaded} Hadiths downloaded (provider advertised ${requested}).`);
  console.log(`Archive: ${outputDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
