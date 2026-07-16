import type { Metadata } from 'next';

import TrustPage from '@/components/trust/trust-page';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description: 'How Read al Quran handles account, reading, analytics, notification, and location data.',
  path: '/privacy-policy',
});

export default function PrivacyPolicyPage() {
  return (
    <TrustPage
      title="Privacy Policy"
      intro="This policy explains the data used to operate Read al Quran and the choices available to users."
      updated="16 July 2026"
      sections={[
        {
          title: 'Data you provide',
          paragraphs: [
            'If you create an account, the service may store your name, email address, authentication provider, preferences, bookmarks, favourites, last-read position, feedback, and notification settings.',
          ],
        },
        {
          title: 'Usage and analytics',
          paragraphs: [
            'Reading and audio activity may be recorded to synchronize progress and improve the product. Optional Google Analytics loads only after you choose “Allow analytics” and only when a valid analytics ID is configured. You can revoke the choice by clearing this site’s browser storage.',
          ],
        },
        {
          title: 'Location and external services',
          paragraphs: [
            'The mosque finder and Qibla tools may ask for browser location permission. Location is used for the requested feature and may be sent to mapping or prayer-data providers. Do not grant location access if you do not want to use these features.',
          ],
        },
        {
          title: 'Notifications and storage',
          paragraphs: [
            'Push-notification subscriptions, prayer reminder preferences, and device identifiers required for delivery may be stored. Public assets and previously requested Quran data may also be cached by the browser or service worker.',
          ],
        },
        {
          title: 'Your choices',
          paragraphs: [
            'You may disable location, notifications, analytics cookies, or local storage through your browser. Contact us to request account-data access, correction, or deletion. Some security and legal records may be retained where necessary.',
          ],
        },
      ]}
    />
  );
}
