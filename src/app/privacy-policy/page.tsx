import type { Metadata } from 'next';

import PrivacyChoicesLink from '@/components/privacy/privacy-choices-link';
import TrustPage from '@/components/trust/trust-page';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description:
    'How Read al Quran handles account, reading, analytics, advertising, cookie, notification, and location data.',
  path: '/privacy-policy',
});

export default function PrivacyPolicyPage() {
  return (
    <TrustPage
      title="Privacy Policy"
      intro="This policy explains what information Read al Quran and its service providers process, why it is used, and the privacy and advertising choices available to visitors."
      updated="2 August 2026"
      sections={[
        {
          title: 'Data you provide',
          paragraphs: [
            'If you create an account, the service may store your name, email address, authentication provider, preferences, bookmarks, favourites, last-read position, feedback, and notification settings.',
          ],
        },
        {
          title: 'Essential cookies and local storage',
          paragraphs: [
            'Essential cookies may keep an account signed in and protect authenticated requests. Browser local storage may remember reading preferences, bookmarks, favourites, theme, audio settings, consent choices, and the last-read position. Disabling essential storage can prevent account or personalisation features from working correctly.',
          ],
        },
        {
          title: 'Usage measurement and Google Analytics',
          paragraphs: [
            'When Google Analytics is enabled and the applicable consent permits it, Google may process usage and performance information such as pages visited, interactions, approximate location derived from an IP address, browser and device information, and advertising or analytics identifiers. We use these reports to understand reliability and improve the reading experience.',
            'Google Analytics data is handled under Google’s own terms and privacy policies. Visitors covered by our European regulations message can accept, reject, or manage analytics storage through the consent controls.',
          ],
          links: [
            {
              label: 'Google Analytics privacy information',
              href: 'https://support.google.com/analytics/answer/6004245',
            },
            {
              label: 'Google Analytics opt-out browser add-on',
              href: 'https://tools.google.com/dlpage/gaoptout',
            },
          ],
        },
        {
          title: 'Google AdSense and advertising cookies',
          paragraphs: [
            'We use Google AdSense to support the service with advertising when ad serving is enabled. Third-party vendors, including Google, may use cookies, web beacons, IP addresses, or other identifiers to serve, limit, measure, and report ads.',
            'Google’s use of advertising cookies enables Google and its partners to serve ads based on a visitor’s prior visits to this website or other websites. Depending on the visitor’s region and consent choice, ads may be personalised, non-personalised, or limited. Declining personalised advertising does not remove access to the core Quran-reading features.',
            'Our Google-certified consent management platform identifies the ad technology providers used for eligible visitors in the EEA, the UK, and Switzerland and records the choices made in the consent message.',
          ],
          links: [
            {
              label: 'Manage personalised advertising in Google Ads Settings',
              href: 'https://adssettings.google.com/',
            },
            {
              label: 'Opt out of participating third-party personalised advertising',
              href: 'https://optout.aboutads.info/',
            },
            {
              label: 'How Google uses data on partner sites',
              href: 'https://policies.google.com/technologies/partner-sites',
            },
          ],
        },
        {
          title: 'Location and external services',
          paragraphs: [
            'The mosque finder and Qibla tools may ask for browser location permission. Location is used for the requested feature and may be sent to mapping or prayer-data providers. Do not grant location access if you do not want to use these features.',
            'Quran, Tafseer, Hadith, prayer-time, mapping, authentication, audio, and notification features may rely on external providers such as Google, Quran.com, HadithAPI.com, Aladhan, OpenStreetMap contributors, and web-push delivery services. A provider may receive the IP address, browser information, and request details technically necessary to return the requested resource.',
          ],
        },
        {
          title: 'Notifications and storage',
          paragraphs: [
            'Push-notification subscriptions, prayer reminder preferences, and device identifiers required for delivery may be stored. Public assets and previously requested Quran data may also be cached by the browser or service worker.',
          ],
        },
        {
          title: 'Retention, sharing, and security',
          paragraphs: [
            'We do not sell personal information. Information is shared only with service providers when needed to operate a requested feature, measure the service, deliver advertising where permitted, comply with law, or protect users and the service. Retention depends on the feature and legal or security requirements; account information is retained while the account is active and may be kept longer where fraud prevention, security, or law requires it.',
            'We use reasonable technical and organisational safeguards, but no internet service can guarantee absolute security.',
          ],
        },
        {
          title: 'Your privacy choices',
          paragraphs: [
            'You may reject or manage advertising and analytics consent where the Google consent message is available, use the opt-out links above, disable location or notifications in the browser, clear cookies and local storage, or use the service without creating an account where that feature permits it.',
            'Contact us to request access to, correction of, or deletion of account data. Some security and legal records may be retained where necessary. Consent can be withdrawn through the Privacy & cookie settings control in the site footer.',
          ],
        },
      ]}
    >
      <section
        id="privacy-choices"
        className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
      >
        <h2 className="font-display text-2xl font-semibold text-[var(--color-heading)]">
          Change your consent choice
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
          If Google’s consent controls are available for your region, use this button to review or
          withdraw your previous advertising and analytics choices.
        </p>
        <PrivacyChoicesLink
          label="Open privacy & cookie settings"
          className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-accent-foreground)] hover:brightness-105"
        />
      </section>
    </TrustPage>
  );
}
