import type { Metadata } from 'next';

import FeedbackForm from '@/components/feedback/feedback-form';
import { buildPageMetadata } from '@/lib/seo';
import { MASTER_SEO_KEYWORDS, TRUST_KEYWORDS } from '@/lib/seo-keywords';

export const metadata: Metadata = buildPageMetadata({
  title: 'Feedback - Help Improve Read al Quran',
  description:
    'Share feedback, report issues, and suggest improvements for Read al Quran. Signed-in users can send direct feedback to help improve the Quran, Hadith, and Islamic tools experience.',
  path: '/feedback',
  index: false,
  follow: false,
  keywords: [
    ...TRUST_KEYWORDS,
    ...MASTER_SEO_KEYWORDS.slice(0, 80),
    'read al quran feedback',
    'quran app feedback',
    'islamic app suggestions',
    'report quran app issue',
  ],
});

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <FeedbackForm />
    </div>
  );
}
