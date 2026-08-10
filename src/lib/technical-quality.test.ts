import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildPageMetadata } from './seo';

function readSource(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('technical quality regressions', () => {
  it('keeps the canonical article library indexable and filtered variants noindex', () => {
    const articlePage = readSource('src/app/articles/page.tsx');

    expect(articlePage).toContain('const hasFilteredView');
    expect(articlePage).toContain('index: !hasFilteredView');
    expect(articlePage).toContain("path: '/articles'");
  });

  it('publishes noindex directives with a stable canonical when requested', () => {
    const metadata = buildPageMetadata({
      title: 'Test page',
      description: 'A technical metadata regression test.',
      path: '/test-page',
      index: false,
    });

    expect(metadata.robots).toMatchObject({ index: false, follow: true, nocache: true });
    expect(metadata.alternates).toMatchObject({
      canonical: 'https://www.readalquran.online/test-page',
    });
  });

  it('does not trigger notification permission or fixed Hadith overlays automatically', () => {
    const guestEnrollment = readSource(
      'src/components/notifications/guest-push-enrollment.tsx'
    );
    const notificationCenter = readSource(
      'src/components/notifications/notification-center.tsx'
    );
    const hadithNudge = readSource('src/components/hadith/HadithQuranNudge.tsx');
    const home = readSource('src/components/home/index.tsx');
    const surahIndex = readSource('src/components/quran/SurahIndexClient.tsx');

    const permissionRequest = 'await Notification.requestPermission()';
    expect(guestEnrollment).not.toContain('PUSH_PROMPT_DELAY_MS');
    expect(guestEnrollment).not.toContain('setPromptVisible(true)');
    expect(guestEnrollment).not.toContain('Notification.requestPermission');
    expect(notificationCenter).toContain('const enableWebsitePush = async () =>');
    expect(notificationCenter).toContain(permissionRequest);
    expect(notificationCenter.indexOf(permissionRequest)).toBeGreaterThan(
      notificationCenter.indexOf('const enableWebsitePush = async () =>')
    );
    expect(notificationCenter.match(/Notification\.requestPermission/g)).toHaveLength(1);
    expect(notificationCenter).toContain("'/api/push/guest-subscribe'");
    expect(hadithNudge).not.toContain("'use client'");
    expect(hadithNudge).not.toContain('className="fixed');
    expect(home).not.toContain('<HomeFeatureTour');
    expect(surahIndex).not.toContain('<SurahFeatureTour');
  });

  it('keeps the shared missing-content state useful for visitors and crawlers', () => {
    const state = readSource('src/components/errors/public-content-state.tsx');

    expect(state).toContain('<h1');
    expect(state).toContain('data-slot="page-shell"');
    expect(state).toContain('href="/"');
  });

  it('normalizes numeric Hadith chapter identifiers from the provider', () => {
    const hadithBookPage = readSource(
      'src/app/hadith/[collection]/books/[book]/page.tsx'
    );

    expect(hadithBookPage).toContain('String(entry.chapterNumber) === chapter');
  });
});
