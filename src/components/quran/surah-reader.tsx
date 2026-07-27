'use client';

import { useEffect, useRef, type ComponentProps } from 'react';

import QuranReaderPage from '@/components/sidebar';
import { useAppSettings } from '@/components/providers/app-settings-provider';

type SurahReaderProps = ComponentProps<typeof QuranReaderPage>;

const DISABLED_READING_MODE_TITLE = 'Reading mode is disabled on Surah pages';

export default function SurahReader(props: SurahReaderProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { settings, setReadingMode } = useAppSettings();

  useEffect(() => {
    if (settings.readingMode !== 'ayah') {
      setReadingMode('ayah');
    }
  }, [settings.readingMode, setReadingMode]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const isContinuousReadingButton = (button: HTMLButtonElement) => {
      const label = button.textContent?.replace(/\s+/g, ' ').trim().toLowerCase();
      return label === 'reading mode' || label === 'continuous';
    };

    const disableContinuousReadingControls = () => {
      root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
        if (!isContinuousReadingButton(button)) return;

        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.setAttribute('title', DISABLED_READING_MODE_TITLE);
      });
    };

    const blockContinuousReading = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest('button');
      if (!(button instanceof HTMLButtonElement) || !isContinuousReadingButton(button)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    disableContinuousReadingControls();

    const observer = new MutationObserver(disableContinuousReadingControls);
    observer.observe(root, { childList: true, subtree: true });
    root.addEventListener('click', blockContinuousReading, true);

    return () => {
      observer.disconnect();
      root.removeEventListener('click', blockContinuousReading, true);
    };
  }, []);

  return (
    <>
      <div ref={rootRef} className="surah-reader-ayah-only contents">
        <QuranReaderPage {...props} />
      </div>
      <style jsx global>{`
        .surah-reader-ayah-only button[title='${DISABLED_READING_MODE_TITLE}'] {
          cursor: not-allowed;
          opacity: 0.45;
        }
      `}</style>
    </>
  );
}
