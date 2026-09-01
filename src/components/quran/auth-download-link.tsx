'use client';

import { Download } from 'lucide-react';
import { type MouseEvent, type ReactNode, useState } from 'react';

import { getClientSession } from '@/lib/client-session';
import {
  queuePendingProtectedDownload,
  startProtectedDownload,
} from '@/lib/protected-download-client';

interface AuthDownloadLinkProps {
  href: string;
  fileName: string;
  className: string;
  children?: ReactNode;
}

const OPEN_AUTH_MODAL_EVENT = 'alhuda:open-auth-modal';

export default function AuthDownloadLink({
  href,
  fileName,
  className,
  children,
}: AuthDownloadLinkProps) {
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    if (isCheckingAccess) {
      return;
    }

    setIsCheckingAccess(true);

    try {
      const session = await getClientSession({ force: true });

      if (session.user?.id) {
        startProtectedDownload(href);
        return;
      }
    } catch {
      // Treat a failed session check as signed out and offer account access.
    } finally {
      setIsCheckingAccess(false);
    }

    queuePendingProtectedDownload(href);
    window.dispatchEvent(
      new CustomEvent(OPEN_AUTH_MODAL_EVENT, {
        detail: {
          tab: 'signin',
          reason: 'download this PDF or audio file',
        },
      })
    );
  };

  return (
    <a
      href={href}
      download={fileName}
      onClick={handleClick}
      className={className}
      aria-busy={isCheckingAccess}
      aria-disabled={isCheckingAccess}
      rel="nofollow"
    >
      {children ?? (
        <>
          <Download className="size-4" aria-hidden="true" />
          Download
        </>
      )}
    </a>
  );
}
