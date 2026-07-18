'use client';

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { buildHadithDetailPath } from '@/lib/hadith/hadith-routing';
import type { HadithItem } from '@/lib/hadith/types/hadith.types';

interface HadithActionsProps {
  hadith: HadithItem;
  shareUrl?: string;
  variant?: 'compact' | 'full';
}

export default function HadithActions({
  hadith,
  shareUrl,
  variant = 'compact',
}: HadithActionsProps) {
  const [copied, setCopied] = useState(false);

  const detailPath =
    shareUrl ?? buildHadithDetailPath(hadith.book.bookSlug, hadith.hadithNumber);

  const handleCopy = async () => {
    const text = [
      hadith.hadithArabic,
      '',
      hadith.hadithEnglish,
      hadith.hadithUrdu ? `\n${hadith.hadithUrdu}` : '',
      '',
      `— ${hadith.book.bookName}, Hadith ${hadith.hadithNumber}`,
    ]
      .filter(Boolean)
      .join('\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const absoluteUrl =
      typeof window !== 'undefined'
        ? new URL(detailPath, window.location.origin).toString()
        : detailPath;

    if (navigator.share) {
      const shareText =
        hadith.hadithEnglish?.slice(0, 200) ||
        hadith.hadithUrdu?.slice(0, 200) ||
        hadith.hadithArabic?.slice(0, 200) ||
        `Hadith ${hadith.hadithNumber} from ${hadith.book.bookName}`;

      await navigator.share({
        title: `Hadith ${hadith.hadithNumber} — ${hadith.book.bookName}`,
        text: shareText,
        url: absoluteUrl,
      });
    }
  };

  const buttonClass =
    variant === 'full'
      ? 'gap-2'
      : 'size-9 p-0';

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size={variant === 'full' ? 'sm' : 'icon'}
        onClick={handleCopy}
        aria-label="Copy hadith"
        className={buttonClass}
      >
        {copied ? (
          <Check className="size-4 text-[var(--color-accent)]" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        {variant === 'full' ? (copied ? 'Copied' : 'Copy') : null}
      </Button>

      {typeof navigator !== 'undefined' && 'share' in navigator ? (
        <Button
          type="button"
          variant="outline"
          size={variant === 'full' ? 'sm' : 'icon'}
          onClick={handleShare}
          aria-label="Share hadith"
          className={buttonClass}
        >
          <Share2 className="size-4" aria-hidden="true" />
          {variant === 'full' ? 'Share' : null}
        </Button>
      ) : null}
    </div>
  );
}
