'use client';

const PENDING_DOWNLOAD_KEY = 'alhuda.pending-protected-download';
const PENDING_DOWNLOAD_TTL_MS = 5 * 60 * 1000;
const PROTECTED_DOWNLOAD_PATH =
  /^\/api\/surah\/\d+\/(?:pdf|audio|ayah\/\d+\/audio)$/;

interface PendingDownload {
  href: string;
  expiresAt: number;
}

function normalizeProtectedDownloadHref(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin);

    if (
      url.origin !== window.location.origin ||
      !PROTECTED_DOWNLOAD_PATH.test(url.pathname)
    ) {
      return null;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function queuePendingProtectedDownload(href: string): boolean {
  const normalizedHref = normalizeProtectedDownloadHref(href);

  if (!normalizedHref) {
    return false;
  }

  try {
    const pendingDownload: PendingDownload = {
      href: normalizedHref,
      expiresAt: Date.now() + PENDING_DOWNLOAD_TTL_MS,
    };
    window.sessionStorage.setItem(
      PENDING_DOWNLOAD_KEY,
      JSON.stringify(pendingDownload)
    );
    return true;
  } catch {
    return false;
  }
}

export function clearPendingProtectedDownload() {
  try {
    window.sessionStorage.removeItem(PENDING_DOWNLOAD_KEY);
  } catch {
    // The authentication flow still works when session storage is unavailable.
  }
}

export function startProtectedDownload(href: string): boolean {
  const normalizedHref = normalizeProtectedDownloadHref(href);

  if (!normalizedHref) {
    return false;
  }

  window.location.assign(normalizedHref);
  return true;
}

export function resumePendingProtectedDownload(): boolean {
  let pendingDownload: PendingDownload | null = null;

  try {
    pendingDownload = JSON.parse(
      window.sessionStorage.getItem(PENDING_DOWNLOAD_KEY) || 'null'
    ) as PendingDownload | null;
  } catch {
    clearPendingProtectedDownload();
    return false;
  }

  clearPendingProtectedDownload();

  if (
    !pendingDownload?.href ||
    !pendingDownload.expiresAt ||
    pendingDownload.expiresAt < Date.now()
  ) {
    return false;
  }

  return startProtectedDownload(pendingDownload.href);
}
