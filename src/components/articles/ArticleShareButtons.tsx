'use client';

import { useState } from 'react';
import { Check, Copy, Linkedin, Send, Share2 } from 'lucide-react';

export interface ArticleShareButtonsProps {
  title: string;
  url: string;
}

type ShareStatus = 'idle' | 'copied' | 'shared' | 'error';

function fallbackCopy(value: string) {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
}

export function ArticleShareButtons({ title, url }: ArticleShareButtonsProps) {
  const [status, setStatus] = useState<ShareStatus>('idle');

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (!fallbackCopy(url)) {
        throw new Error('Clipboard is unavailable');
      }
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  };

  const shareArticle = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({ title, url });
      setStatus('shared');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setStatus('error');
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const socialLinkClass =
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:border-teal-600/35 hover:bg-teal-500/8 hover:text-teal-700 dark:hover:text-teal-300';
  const buttonClass = socialLinkClass;

  return (
    <section aria-labelledby="article-share-heading" className="my-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="article-share-heading" className="font-display text-xl font-semibold text-[var(--color-heading)]">
            Share this article
          </h2>
          <p className="mt-1 text-xs text-[var(--color-muted-text)]">Share the page link so readers can review the full context and sources.</p>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Article sharing options">
          <button type="button" onClick={shareArticle} className={buttonClass}>
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </button>
          <button type="button" onClick={copyLink} className={buttonClass}>
            {status === 'copied' ? <Check className="size-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {status === 'copied' ? 'Copied' : 'Copy link'}
          </button>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Share on LinkedIn (opens in a new tab)"
            className={socialLinkClass}
          >
            <Linkedin className="size-4" aria-hidden="true" />
            LinkedIn
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Share on X (opens in a new tab)"
            className={socialLinkClass}
          >
            <span aria-hidden="true" className="text-sm font-black">𝕏</span>
            X
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Share on WhatsApp (opens in a new tab)"
            className={socialLinkClass}
          >
            <Send className="size-4" aria-hidden="true" />
            WhatsApp
          </a>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {status === 'copied'
          ? 'Article link copied to the clipboard.'
          : status === 'shared'
            ? 'Article shared.'
            : status === 'error'
              ? 'The article could not be shared. Please copy the address from your browser.'
              : ''}
      </p>
    </section>
  );
}

export default ArticleShareButtons;
