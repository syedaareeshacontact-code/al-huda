import type { Metadata } from 'next';

import TrustPage from '@/components/trust/trust-page';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms of Use',
  description: 'Terms for using Read al Quran, its Quran, Hadith, Tafseer, prayer, and download tools.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <TrustPage
      title="Terms of Use"
      intro="By using Read al Quran, you agree to use the service lawfully and to verify time-sensitive or religious decisions with appropriate local authorities."
      updated="16 July 2026"
      sections={[
        {
          title: 'Educational service',
          paragraphs: [
            'Read al Quran is a reading and learning platform. It does not replace qualified scholars, local mosques, medical professionals, lawyers, or financial advisers.',
          ],
        },
        {
          title: 'Prayer times and religious dates',
          paragraphs: [
            'Prayer times and Hijri dates are calculated through third-party data services and may differ from local mosque schedules or moon-sighting announcements. Always follow trusted local authorities where differences matter.',
          ],
        },
        {
          title: 'Content and downloads',
          paragraphs: [
            'Quran, translation, Tafseer, Hadith, audio, and map data may be supplied by external providers. Their licenses and terms continue to apply. Downloads are for personal, respectful use unless the relevant source permits broader reuse.',
          ],
        },
        {
          title: 'Accounts and acceptable use',
          paragraphs: [
            'Keep your account secure. Do not attempt to disrupt the service, scrape protected endpoints excessively, bypass access controls, upload harmful material, or impersonate another person.',
          ],
        },
        {
          title: 'Availability and changes',
          paragraphs: [
            'Features may change or become temporarily unavailable when external services fail. We may update these terms and will change the last-updated date when material revisions are published.',
          ],
        },
      ]}
    />
  );
}
