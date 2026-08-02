import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

describe('homepage editorial trust', () => {
  it('shows the original content, learning, author, and review sections', () => {
    const homepageSections = read('src/components/home/home-editorial-sections.tsx');

    for (const heading of [
      'Latest original guides',
      'Featured Quran studies',
      'Popular learning resources',
      'A focused Quran companion',
      'How our content is reviewed',
      'Zain Qalandar Shah',
    ]) {
      expect(homepageSections).toContain(heading);
    }
  });

  it('attributes every original article to the named author', () => {
    const articlesDirectory = path.join(root, 'content', 'articles');
    const articleFiles = readdirSync(articlesDirectory).filter((file) => file.endsWith('.mdx'));

    expect(articleFiles.length).toBeGreaterThan(0);
    for (const articleFile of articleFiles) {
      const source = readFileSync(path.join(articlesDirectory, articleFile), 'utf8');
      expect(source).toContain('author: "Zain Qalandar Shah"');
    }
  });

  it('uses Person structured data for the author', () => {
    const homePage = read('src/app/page.tsx');
    const articlePage = read('src/app/articles/[slug]/page.tsx');

    expect(homePage).toContain("'@type': 'Person'");
    expect(homePage).toContain('author-zain-qalandar-shah');
    expect(articlePage).toContain("'@type': 'Person'");
  });
});
