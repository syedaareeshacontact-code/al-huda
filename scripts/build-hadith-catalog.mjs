import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { getAvailableHadithNumbers } from '../src/lib/seo/hadith-catalog.mjs';

const dataRoot = join(process.cwd(), 'src/data');
const manifest = JSON.parse(readFileSync(join(dataRoot, 'hadith-api/manifest.json'), 'utf8'));
const collections = [];
for (const book of manifest.books) {
  if (!book.downloadedCount) continue;
  if (!/^[a-z0-9-]+$/.test(book.slug)) throw new Error('Invalid collection slug.');
  const raw = readFileSync(join(dataRoot, 'hadith-api/hadiths', `${book.slug}.json`));
  const payload = JSON.parse(raw.toString('utf8'));
  if (!Array.isArray(payload.hadiths?.data) || payload.hadiths.data.length !== book.downloadedCount) throw new Error(`Incomplete snapshot: ${book.slug}`);
  const numbers = getAvailableHadithNumbers(payload.hadiths.data).map(Number);
  if (!numbers.length) throw new Error(`No readable records: ${book.slug}`);
  // Compress only consecutive identifiers that were actually found. Preserve every gap.
  const ranges = [];
  for (const number of numbers) {
    const last = ranges.at(-1);
    if (last && last[1] + 1 === number) last[1] = number;
    else ranges.push([number, number]);
  }
  collections.push({ slug: book.slug, sourceSha256: createHash('sha256').update(raw).digest('hex'),
    recordCount: numbers.length, ranges });
}
const catalog = { source: 'src/data/hadith-api', collections };
if (process.argv.includes('--check')) {
  const current = JSON.parse(readFileSync(join(dataRoot, 'hadith-catalog.json'), 'utf8'));
  if (JSON.stringify(current) !== JSON.stringify(catalog)) throw new Error('Hadith discovery catalog is stale. Regenerate and review before building.');
  console.log(`Hadith discovery catalog verified against ${collections.length} source files.`);
} else {
  process.stdout.write(JSON.stringify(catalog, null, 2) + '\n');
}
