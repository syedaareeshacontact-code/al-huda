'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

import { ADSENSE_CLIENT_ID, shouldLoadAdSense } from '@/lib/adsense';

export function AdSenseLoader() {
  const pathname = usePathname();

  if (!shouldLoadAdSense(pathname)) {
    return null;
  }

  return (
    <Script
      id="google-adsense"
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
    />
  );
}

export default AdSenseLoader;
