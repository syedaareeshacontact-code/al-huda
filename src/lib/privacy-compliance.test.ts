import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

describe('privacy and advertising compliance', () => {
  it('publishes the AdSense tag and account identifier together', () => {
    const layout = read('src/app/layout.tsx');
    const loader = read('src/components/ads/adsense-loader.tsx');
    const configuration = read('src/lib/adsense.ts');

    expect(layout).toContain('google-adsense-account');
    expect(layout).toContain('<AdSenseLoader />');
    expect(loader).toContain('shouldLoadAdSense(pathname)');
    expect(loader).toContain('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
    expect(configuration).toContain('ca-pub-2876888675525619');
  });

  it('discloses advertising identifiers and provides opt-out resources', () => {
    const privacyPolicy = read('src/app/privacy-policy/page.tsx');

    expect(privacyPolicy).toContain('Third-party vendors, including Google');
    expect(privacyPolicy).toContain('cookies, web beacons, IP addresses');
    expect(privacyPolicy).toContain('https://adssettings.google.com/');
    expect(privacyPolicy).toContain('https://policies.google.com/technologies/partner-sites');
  });

  it('keeps consent revocation available from the site footer', () => {
    const footer = read('src/components/layout/site-footer.tsx');
    const privacyChoices = read('src/components/privacy/privacy-choices-link.tsx');

    expect(footer).toContain('PrivacyChoicesLink');
    expect(privacyChoices).toContain('showRevocationMessage');
  });
});
