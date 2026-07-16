import type { Metadata } from 'next';

import TrustPage from '@/components/trust/trust-page';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Corrections Policy',
  description: 'How to report and how Read al Quran handles Quran, translation, Tafseer, Hadith, and prayer-data errors.',
  path: '/corrections',
});

export default function CorrectionsPage() {
  return (
    <TrustPage
      title="Corrections Policy"
      intro="Religious text and prayer data require careful handling. Reports are checked against the named source before product copy, mappings, or integrations are changed."
      updated="16 July 2026"
      sections={[
        {
          title: 'What to report',
          paragraphs: [
            'Please report missing or incorrect Arabic text, translation alignment, Tafseer attribution, Hadith reference or grade, broken audio, wrong prayer dates, incorrect city information, broken links, privacy concerns, or misleading product claims.',
          ],
        },
        {
          title: 'Information to include',
          paragraphs: [
            'Include the full page URL, Surah and Ayah or Hadith reference, city and displayed date where relevant, a screenshot, the expected correction, and a reliable source that supports it.',
          ],
        },
        {
          title: 'Correction process',
          paragraphs: [
            'We reproduce the issue, compare it with the source provider or a recognized edition, correct the application or integration, test the affected routes, and update visible wording when a claim was inaccurate. Provider-side errors may be reported upstream and clearly marked while unresolved.',
          ],
        },
      ]}
    />
  );
}
