'use client';

import { Download } from 'lucide-react';
import { type MouseEvent, type ReactNode, useState } from 'react';

import { getClientSession } from '@/lib/client-session';
import {
  queuePendingProtectedDownload,
  startProtectedDownload,
} from '@/lib/protected-download-client';
import { decodeProtectedDownloadHref } from '@/lib/protected-download-token';

interface AuthDownloadLinkProps {
  downloadToken: string;
  fileName: string;
  className: string;
  children?: ReactNode;
}

const OPEN_AUTH_MODAL_EVENT = 'alhuda:open-auth-modal';

export default function AuthDownloadLink({
  downloadToken,
  fileName,
  className,
  children,
}: AuthDownloadLinkProps) {
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const href = decodeProtectedDownloadHref(downloadToken);
    if (!href) {
      return;
    }

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
    <button
      type="button"
      onClick={handleClick}
      className={className}
      aria-busy={isCheckingAccess}
      aria-disabled={isCheckingAccess}
    >
      {children ?? (
        <>
          <Download className="size-4" aria-hidden="true" />
          Download
        </>
      )}
    </button>
  );
}
