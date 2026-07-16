'use client';

import type { HTMLAttributes, MouseEvent, PropsWithChildren } from 'react';

export const QURAN_POPUP_NAVIGATION_EVENT = 'quran-popup-navigation';

interface NavigateOptions {
  replace?: boolean;
}

function getInternalTarget(href: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  const target = new URL(href, window.location.href);
  const current = new URL(window.location.href);

  if (target.origin !== current.origin || target.pathname !== current.pathname) {
    return null;
  }

  return target;
}

export function navigateToQuranPopup(href: string, options: NavigateOptions = {}) {
  const target = getInternalTarget(href);
  if (!target) {
    return false;
  }

  const nextUrl = `${target.pathname}${target.search}${target.hash}`;
  if (options.replace) {
    window.history.replaceState(window.history.state, '', nextUrl);
  } else {
    window.history.pushState(window.history.state, '', nextUrl);
  }
  window.dispatchEvent(new Event(QURAN_POPUP_NAVIGATION_EVENT));
  return true;
}

function isPlainPrimaryClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function AyahPopupLinkScope({
  children,
  onClickCapture,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    onClickCapture?.(event);
    if (event.defaultPrevented || !isPlainPrimaryClick(event)) {
      return;
    }

    const target = event.target as Element | null;
    const anchor = target?.closest<HTMLAnchorElement>('a[href]');
    if (!anchor || (anchor.target && anchor.target !== '_self')) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (href && navigateToQuranPopup(href)) {
      event.preventDefault();
    }
  };

  return (
    <div {...props} onClickCapture={handleClickCapture}>
      {children}
    </div>
  );
}
