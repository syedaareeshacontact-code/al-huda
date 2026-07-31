type ClientEventValue = string | number | boolean | undefined;

type ClientEventParams = Record<string, ClientEventValue>;

declare global {
  interface Window {
    dataLayer?: Object[];
    gtag?: (...args: unknown[]) => void;
  }
}

function analyticsAllowed() {
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  if (!isLocalhost) return true;

  try {
    return window.localStorage.getItem('alhuda:analytics-consent') === 'accepted';
  } catch {
    return false;
  }
}

export function trackClientEvent(eventName: string, params: ClientEventParams = {}) {
  if (typeof window === 'undefined' || !analyticsAllowed()) return;

  const cleanParams = Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string | number | boolean] => {
      return entry[1] !== undefined && entry[1] !== '';
    })
  );

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, cleanParams);
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: eventName, ...cleanParams });
}
