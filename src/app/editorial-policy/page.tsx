import type { Metadata } from 'next';

import TrustPage from '@/components/trust/trust-page';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Editorial & Source Policy',
  description: 'Sources, attribution, review standards, and limitations for Quran, Tafseer, and Hadith content.',
  path: '/editorial-policy',
});

export default function EditorialPolicyPage() {
  return (
    <TrustPage
      title="Editorial & Source Policy"
      intro="We separate source material from product-written guidance and identify the provider or edition wherever the application has that information."
      updated="16 July 2026"
      sections={[
        {
          title: 'Primary data sources',
          paragraphs: [
            'Quran text, chapter metadata, translations, recitation references, and available Tafseer are retrieved through Quran.com APIs. Hadith collection data is retrieved through HadithAPI.com. Prayer and Hijri calculations use Aladhan, while mosque discovery uses OpenStreetMap community data.',
          ],
          items: [
            'English Quran translation: Sahih International, resource ID 20.',
            'Urdu Quran translation: Fatah Muhammad Jalandhari, resource ID 234.',
            'Tafseer pages display the source name returned by the provider.',
            'Hadith grades and references are displayed only where supplied by the data source.',
          ],
        },
        {
          title: 'Product-written content',
          paragraphs: [
            'Introductions, navigation labels, FAQs, and explanatory guides written for this website are intended to help users operate the product. They must not introduce unsupported religious rulings or present devotional claims as verified facts without a reliable citation.',
          ],
        },
        {
          title: 'Review status',
          paragraphs: [
            'The platform does not claim that every page has been independently reviewed by an appointed scholar. Source attribution and provider data are shown transparently, and users should consult qualified scholars for interpretation, authenticity disputes, or religious rulings.',
          ],
        },
        {
          title: 'Automation and updates',
          paragraphs: [
            'Programmatic pages must provide a unique canonical URL, useful primary content, accurate metadata, and working internal links. Dates are published only when they represent a real update; automatic freshness claims are not used.',
          ],
        },
      ]}
    />
  );
}
