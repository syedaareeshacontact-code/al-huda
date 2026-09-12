import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { getSearchCatalog } from './seo/search-catalog';
import { PRIMARY_AUTHOR } from './author-profile';

const ROOT = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

describe('owner and author trust signals', () => {
  it('introduces the site owner and links to the full author profile', () => {
    const aboutPage = read('src/components/about/index.tsx');

    expect(aboutPage).toContain('Site owner, author &amp; content editor');
    expect(aboutPage).toContain('Zain Qalandar Shah');
    expect(aboutPage).toContain('/authors/zain-qalandar-shah');
  });

  it('publishes responsibilities, limitations, contact, and authored work', () => {
    const profilePage = read('src/app/authors/zain-qalandar-shah/page.tsx');

    for (const trustSignal of [
      'Editorial responsibilities',
      'Qualifications and review limitations',
      'Read editorial policy',
      'Report a correction',
      'Contact Zain',
      'Articles by',
      "'@type': 'Person'",
    ]) {
      expect(profilePage).toContain(trustSignal);
    }
  });

  it('uses the author profile in article links, structured data, and sitemaps', () => {
    expect(read('src/components/articles/ArticleHeader.tsx')).toContain('PRIMARY_AUTHOR.href');
    expect(read('src/app/articles/[slug]/page.tsx')).toContain('PRIMARY_AUTHOR.href');
    expect(getSearchCatalog().filter(record => record.path === PRIMARY_AUTHOR.href)).toHaveLength(1);
  });
});
