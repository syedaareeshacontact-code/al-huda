import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function findFiles(directory: string, extension: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = path.join(directory, entry);
    if (statSync(absolutePath).isDirectory()) {
      return findFiles(absolutePath, extension);
    }
    return absolutePath.endsWith(extension) ? [absolutePath] : [];
  });
}

describe('SEO regressions', () => {
  it('keeps individual ayah and tafsir routes self-canonical', () => {
    const ayahPage = read('src/app/surah/[surah]/ayah/[ayah]/page.tsx');
    const tafsirPage = read('src/app/tafsir/[surah]/[ayah]/page.tsx');

    expect(ayahPage).not.toContain('if (!featuredAyah)');
    expect(ayahPage).not.toContain('permanentRedirect(buildAyahPopupPath');
    expect(tafsirPage).not.toContain('if (!featuredAyah)');
    expect(tafsirPage).not.toContain('permanentRedirect(buildTafsirPopupPath');
  });

  it('does not expose protected download API URLs as crawlable links', () => {
    const downloadLink = read('src/components/quran/auth-download-link.tsx');
    const downloadSchema = read('src/lib/seo-schema.ts');

    expect(downloadLink).toContain('<button');
    expect(downloadLink).not.toContain('<a');
    expect(downloadLink).not.toContain('href={href}');
    expect(downloadLink).toContain('decodeProtectedDownloadHref');
    expect(downloadSchema).not.toContain('toAbsoluteUrl(option.href)');
  });

  it('publishes chunked full-detail sitemaps without fake freshness signals', () => {
    const sitemap = read('src/app/sitemaps/[name]/route.ts');
    expect(sitemap).toContain('SITEMAP_CHUNK_SIZE = 5_000');
    expect(sitemap).toContain('buildAyahPath');
    expect(sitemap).toContain('buildTafsirPath');
    expect(sitemap).toContain('hadith-detail-');
    expect(sitemap).not.toContain('<lastmod>');
    expect(sitemap).not.toContain('<changefreq>');
    expect(sitemap).not.toContain('<priority>');
  });

  it('does not emit obsolete meta keywords or sitelinks SearchAction schema', () => {
    const seo = read('src/lib/seo.ts');
    const layout = read('src/app/layout.tsx');
    expect(seo).not.toContain('metadata.keywords');
    expect(seo).not.toContain("'@type': 'SearchAction'");
    expect(seo).not.toContain("site: '@al_huda_quran'");
    expect(layout).not.toContain('keywords:');
  });

  it('keeps FAQ schema questions visible on the matching content pages', () => {
    const duas = read('src/app/duas/page.tsx');
    const duaCategory = read('src/app/duas/[category]/page.tsx');
    const mosqueFinder = read('src/app/mosque-finder/page.tsx');
    const cityMosqueFinder = read('src/app/mosque-finder/[city]/page.tsx');

    expect(duas).toContain('getDuasFaqItems');
    expect(duas).toContain('faqItems.map');
    expect(duaCategory).toContain('faqItems.map');
    expect(mosqueFinder).toContain('getMosqueFinderFaqItems');
    expect(mosqueFinder).toContain('faqItems.map');
    expect(cityMosqueFinder).toContain('faqItems.map');
  });

  it('has only one application main landmark', () => {
    const files = findFiles(path.join(root, 'src'), '.tsx');
    const nestedMainFiles = files
      .filter((file) => !file.endsWith(path.join('src', 'app', 'layout.tsx')))
      .filter((file) => readFileSync(file, 'utf8').includes('<main'));

    expect(nestedMainFiles).toEqual([]);
  });

  it('keeps local environment files untracked', () => {
    const gitignore = read('.gitignore');
    expect(gitignore).toContain('.env*');
    expect(gitignore).not.toMatch(/^!\.env/m);
  });

  it('keeps trust pages and visible source policies in the product', () => {
    for (const page of [
      'src/app/privacy-policy/page.tsx',
      'src/app/terms/page.tsx',
      'src/app/editorial-policy/page.tsx',
      'src/app/corrections/page.tsx',
    ]) {
      expect(read(page)).toContain('TrustPage');
    }
  });
});
