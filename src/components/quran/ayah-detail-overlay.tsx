'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Headphones,
  Languages,
  X,
} from 'lucide-react';

import AuthDownloadLink from '@/components/quran/auth-download-link';
import { Button } from '@/components/ui/button';
import { formatQuranArabicForDisplay } from '@/lib/arabic-utils';
import {
  buildAyahPopupPath,
  buildSurahPath,
  buildTafsirPopupPath,
  buildTafsirSurahPath,
} from '@/lib/quran-routing';
import type { AyahDetailPayload } from '@/types/quran';

interface AyahDetailOverlayProps {
  mode: 'ayah' | 'tafsir';
  surahId: number;
  surahName: string;
  surahArabicName: string;
  totalAyahs: number;
}

function parseAyahNumber(value: string | null, totalAyahs: number) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > totalAyahs) {
    return null;
  }

  return parsed;
}

export default function AyahDetailOverlay({
  mode,
  surahId,
  surahName,
  surahArabicName,
  totalAyahs,
}: AyahDetailOverlayProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [payload, setPayload] = useState<AyahDetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedAyah = parseAyahNumber(searchParams.get('ayah'), totalAyahs);

  const closePath = useMemo(
    () =>
      mode === 'tafsir'
        ? buildTafsirSurahPath(surahId, surahName)
        : buildSurahPath(surahId, surahName),
    [mode, surahId, surahName]
  );

  const buildPopupPath = useCallback(
    (ayahNumber: number) =>
      mode === 'tafsir'
        ? buildTafsirPopupPath(surahId, surahName, ayahNumber)
        : buildAyahPopupPath(surahId, surahName, ayahNumber),
    [mode, surahId, surahName]
  );

  const close = useCallback(() => {
    router.replace(closePath, { scroll: false });
  }, [closePath, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedAyah) {
      setPayload(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({
      surah: String(surahId),
      ayah: String(selectedAyah),
    });
    if (mode === 'tafsir') {
      query.set('includeTafsir', 'true');
    }

    setPayload(null);
    setLoading(true);
    setError(null);

    void fetch(`/api/quran/ayah?${query.toString()}`, {
      signal: controller.signal,
      cache: 'force-cache',
    })
      .then(async (response) => {
        const body = (await response.json()) as AyahDetailPayload & { message?: string };
        if (!response.ok) {
          throw new Error(body.message ?? 'Ayah details could not be loaded.');
        }
        return body;
      })
      .then((body) => {
        setPayload(body);
      })
      .catch((loadError: unknown) => {
        const errorObject = loadError as { name?: string; message?: string };
        if (errorObject.name !== 'AbortError') {
          setError(errorObject.message ?? 'Ayah details could not be loaded.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [mode, selectedAyah, surahId]);

  useEffect(() => {
    if (!selectedAyah) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [close, selectedAyah]);

  if (!mounted || !selectedAyah) {
    return null;
  }

  const arabicText = formatQuranArabicForDisplay(payload?.arabicText ?? '');
  const previousAyah = selectedAyah > 1 ? selectedAyah - 1 : null;
  const nextAyah = selectedAyah < totalAyahs ? selectedAyah + 1 : null;
  const ayahPopupPath = buildAyahPopupPath(surahId, surahName, selectedAyah);
  const tafsirPopupPath = buildTafsirPopupPath(surahId, surahName, selectedAyah);

  return createPortal(
    <div className="fixed inset-0 z-[160]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={close}
        aria-label={`Close Ayah ${surahId}:${selectedAyah}`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="ayah-detail-overlay-title"
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] min-h-[62dvh] flex-col overflow-hidden rounded-t-2xl border-t border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_55%)] bg-[var(--color-surface)] shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:min-h-0 sm:w-[min(46rem,calc(100vw-3rem))] sm:rounded-none sm:border-l sm:border-t-0"
      >
        <header className="shrink-0 border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface),var(--color-accent)_4%)] px-4 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border)] sm:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                {mode === 'tafsir' ? 'Urdu Tafseer' : 'Ayah Detail'}
              </p>
              <h2
                id="ayah-detail-overlay-title"
                className="mt-1 truncate font-display text-2xl text-[var(--color-heading)] sm:text-3xl"
              >
                Surah {surahName} · {surahId}:{selectedAyah}
              </h2>
              <p className="arabic-font mt-1 text-right text-base text-[var(--color-muted-text)]" dir="rtl" lang="ar">
                {surahArabicName}
              </p>
            </div>
            <Button
              ref={closeButtonRef}
              type="button"
              variant="outline"
              size="icon"
              onClick={close}
              aria-label="Close ayah details"
              title="Close"
              className="size-10 shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="space-y-4 p-4 sm:p-6" aria-live="polite">
              <div className="h-32 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
              <div className="h-24 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
              <div className="h-24 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
              <p className="text-sm text-[var(--color-muted-text)]">
                Loading Ayah {surahId}:{selectedAyah}...
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="m-4 rounded-lg border border-[color-mix(in_oklab,var(--color-danger),var(--color-border)_55%)] bg-[color-mix(in_oklab,var(--color-danger),var(--color-surface)_94%)] p-4 sm:m-6" role="alert">
              <p className="font-semibold text-[var(--color-danger)]">Unable to open this ayah</p>
              <p className="mt-1 text-sm text-[var(--color-muted-text)]">{error}</p>
            </div>
          ) : null}

          {payload ? (
            <div>
              <section className="border-b border-[var(--color-border)] px-4 py-6 sm:px-7 sm:py-8">
                <p
                  lang="ar"
                  dir="rtl"
                  className="arabic-font quran-script arabic-reading text-right text-[var(--color-heading)]"
                >
                  {arabicText || 'Arabic text unavailable.'}
                </p>
              </section>

              <section className="border-b border-[var(--color-border)] px-4 py-5 sm:px-7">
                <div className="mb-3 flex items-center justify-end gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
                  Urdu Translation
                  <Languages className="size-4" aria-hidden="true" />
                </div>
                <p
                  lang="ur"
                  dir="rtl"
                  className="urdu-font text-right text-lg leading-loose text-[var(--color-text)]"
                >
                  {payload.urduTranslation || 'Urdu translation unavailable.'}
                </p>
              </section>

              <section className="border-b border-[var(--color-border)] px-4 py-5 sm:px-7">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
                  <Languages className="size-4" aria-hidden="true" />
                  English Translation
                </div>
                <p className="max-w-[70ch] text-sm leading-7 text-[var(--color-text)] sm:text-base">
                  {payload.englishTranslation || 'English translation unavailable.'}
                </p>
              </section>

              {mode === 'tafsir' ? (
                <section className="border-b border-[var(--color-border)] px-4 py-5 sm:px-7 sm:py-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                        Complete Commentary
                      </p>
                      <h3 className="mt-1 font-display text-2xl text-[var(--color-heading)]">
                        Urdu Tafseer
                      </h3>
                    </div>
                    <FileText className="size-5 text-[var(--color-accent)]" aria-hidden="true" />
                  </div>
                  {payload.tafsir ? (
                    <>
                      <p className="mb-4 text-xs text-[var(--color-muted-text)]">
                        Source: {payload.tafsir.sourceName}
                      </p>
                      <div
                        className="tafseer-rich urdu-font space-y-4 text-right leading-loose text-[var(--color-text)]"
                        lang="ur"
                        dir="rtl"
                        dangerouslySetInnerHTML={{ __html: payload.tafsir.textHtml }}
                      />
                    </>
                  ) : (
                    <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-muted-text)]">
                      Urdu tafseer is not available for this ayah.
                    </p>
                  )}
                </section>
              ) : null}

              <section className="px-4 py-5 sm:px-7 sm:py-6">
                <div className="mb-4 flex items-center gap-2">
                  <Headphones className="size-5 text-[var(--color-accent)]" aria-hidden="true" />
                  <h3 className="font-display text-xl text-[var(--color-heading)]">Ayah Audio</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Arabic Recitation', language: 'Arabic', url: payload.audio.arabic },
                    { label: 'Urdu Audio', language: 'Urdu', url: payload.audio.urdu },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
                    >
                      <p className="mb-2 text-sm font-semibold text-[var(--color-heading)]">
                        {item.label}
                      </p>
                      {item.url ? (
                        <>
                          <audio controls preload="none" className="w-full">
                            <source src={item.url} />
                          </audio>
                          <AuthDownloadLink
                            href={item.url}
                            fileName={`surah-${surahId}-ayah-${selectedAyah}-${item.language.toLowerCase()}-audio`}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-soft)]"
                          >
                            <Download className="size-3.5" />
                            Download
                          </AuthDownloadLink>
                        </>
                      ) : (
                        <p className="text-xs text-[var(--color-muted-text)]">Audio unavailable.</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!previousAyah}
              onClick={() => {
                if (previousAyah) {
                  router.replace(buildPopupPath(previousAyah), { scroll: false });
                }
              }}
              aria-label="Previous ayah"
              title="Previous ayah"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="flex min-w-0 flex-1 justify-center gap-2">
              {mode === 'tafsir' ? (
                <Link
                  href={ayahPopupPath}
                  scroll={false}
                  className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
                >
                  <BookOpen className="size-4 shrink-0" />
                  <span className="truncate">Read Ayah</span>
                </Link>
              ) : payload?.hasTafsir ? (
                <Link
                  href={tafsirPopupPath}
                  scroll={false}
                  className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-3 text-sm font-semibold text-[var(--color-accent-foreground)] transition hover:brightness-105"
                >
                  <FileText className="size-4 shrink-0" />
                  <span className="truncate">Open Tafseer</span>
                </Link>
              ) : (
                <span className="inline-flex h-10 items-center px-3 text-xs text-[var(--color-muted-text)]">
                  Tafseer unavailable
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!nextAyah}
              onClick={() => {
                if (nextAyah) {
                  router.replace(buildPopupPath(nextAyah), { scroll: false });
                }
              }}
              aria-label="Next ayah"
              title="Next ayah"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </footer>
      </aside>
    </div>,
    document.body
  );
}
