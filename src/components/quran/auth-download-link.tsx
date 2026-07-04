'use client';

import { Download } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';

interface AuthDownloadLinkProps {
  href: string;
  fileName: string;
  className: string;
  children?: ReactNode;
}

const OPEN_AUTH_MODAL_EVENT = 'alhuda:open-auth-modal';

async function isSignedIn() {
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store' });
    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { user?: { id?: string | null } | null };
    return Boolean(payload.user?.id);
  } catch {
    return false;
  }
}

export default function AuthDownloadLink({
  href,
  fileName,
  className,
  children,
}: AuthDownloadLinkProps) {
  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (await isSignedIn()) {
      return;
    }

    event.preventDefault();
    window.dispatchEvent(
      new CustomEvent(OPEN_AUTH_MODAL_EVENT, {
        detail: { tab: 'signin', reason: 'download files' },
      })
    );
  };

  return (
    <a href={href} download={fileName} onClick={handleClick} className={className}>
      {children ?? (
        <>
          <Download className="size-4" aria-hidden="true" />
          Download
        </>
      )}
    </a>
  );
}
