'use client';

import { useEffect } from 'react';

/**
 * Performance monitoring component
 * Tracks Core Web Vitals and logs them for monitoring
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // Track Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          const lcp = lastEntry.renderTime || lastEntry.loadTime;
          console.debug(`LCP: ${lcp}ms`);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID) / Interaction to Next Paint (INP)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fid = (entries[0] as any).processingDuration;
          console.debug(`FID/INP: ${fid}ms`);
        });
        fidObserver.observe({ entryTypes: ['first-input', 'event'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const e = entry as any;
            if (!e.hadRecentInput) {
              clsValue += e.value;
              console.debug(`CLS: ${clsValue}`);
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        return () => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
        };
      } catch (e) {
        console.debug('Performance monitoring not available');
      }
    }
  }, []);

  return null; // This is a monitoring component, doesn't need to render anything
}
