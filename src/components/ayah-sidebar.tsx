'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react';

import { formatQuranArabicForDisplay } from '@/lib/arabic-utils';
import { buildAyahPopupPath } from '@/lib/quran-routing';

interface AyahSidebarProps {
  surahId: number;
  surahName: string;
  ayahNumber: number;
  totalAyah: number;
  arabicText: string;
  urduTranslation: string;
  englishTranslation: string;
  tafsirPath?: string;
  surahPath: string;
}

export default function AyahSidebar({
  surahId,
  surahName,
  ayahNumber,
  totalAyah,
  arabicText,
  urduTranslation,
  englishTranslation,
  tafsirPath,
  surahPath,
}: AyahSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'text' | 'tafseer' | null>('text');
  const arabicTextForDisplay = formatQuranArabicForDisplay(arabicText);

  const toggleExpand = (section: 'text' | 'tafseer') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <>
      {/* Menu Button - Fixed at top right */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 z-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 hover:bg-[var(--color-surface-soft)]"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <X className="size-5 text-[var(--color-text)]" />
        ) : (
          <Menu className="size-5 text-[var(--color-text)]" />
        )}
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed right-0 top-0 z-40 h-screen w-80 overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--color-heading)]">
            Ayah {surahId}:{ayahNumber}
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 hover:bg-[var(--color-surface-soft)]"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Ayah Navigation */}
        <div className="mb-6 space-y-2">
          <div className="flex gap-2">
            {ayahNumber > 1 && (
              <Link
                href={buildAyahPopupPath(surahId, surahName, ayahNumber - 1)}
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-accent)] hover:border-[var(--color-accent-soft)]"
              >
                ← Prev
              </Link>
            )}
            {ayahNumber < totalAyah && (
              <Link
                href={buildAyahPopupPath(surahId, surahName, ayahNumber + 1)}
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-accent)] hover:border-[var(--color-accent-soft)]"
              >
                Next →
              </Link>
            )}
          </div>
          <Link
            href={surahPath}
            onClick={() => setIsOpen(false)}
            className="block w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-center text-sm font-semibold text-[var(--color-accent)] hover:border-[var(--color-accent-soft)]"
          >
            Back to Surah
          </Link>
        </div>

        {/* Ayah Details Sections */}
        <div className="space-y-4">
          {/* Arabic Text Section */}
          <div className="rounded-lg border border-[var(--color-border)]">
            <button
              onClick={() => toggleExpand('text')}
              className="flex w-full items-center justify-between bg-[var(--color-surface-soft)] p-3 text-sm font-bold text-[var(--color-heading)] hover:bg-[var(--color-surface-soft)]/80"
            >
              <span>Arabic Text</span>
              {expandedSection === 'text' ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
            {expandedSection === 'text' && (
              <div className="space-y-3 p-3">
                <p
                  lang="ar"
                  dir="rtl"
                  className="arabic-font leading-relaxed text-[var(--color-heading)]"
                >
                  {arabicTextForDisplay || 'N/A'}
                </p>
                <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
                  <p className="text-xs font-semibold text-[var(--color-muted-text)]">
                    Urdu Translation:
                  </p>
                  <p
                    lang="ur"
                    dir="rtl"
                    className="urdu-font text-sm leading-relaxed text-[var(--color-text)]"
                  >
                    {urduTranslation || 'N/A'}
                  </p>
                </div>
                <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
                  <p className="text-xs font-semibold text-[var(--color-muted-text)]">
                    English Translation:
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--color-text)]">
                    {englishTranslation || 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tafseer Link Section */}
          {tafsirPath && (
            <div className="rounded-lg border border-[var(--color-border)]">
              <button
                onClick={() => toggleExpand('tafseer')}
                className="flex w-full items-center justify-between bg-[var(--color-surface-soft)] p-3 text-sm font-bold text-[var(--color-heading)] hover:bg-[var(--color-surface-soft)]/80"
              >
                <span>Tafseer</span>
                {expandedSection === 'tafseer' ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
              {expandedSection === 'tafseer' && (
                <div className="space-y-3 p-3">
                  <p className="text-xs text-[var(--color-muted-text)]">
                    Complete Urdu tafseer for this ayah
                  </p>
                  <Link
                    href={tafsirPath}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-lg bg-[var(--color-accent)] px-3 py-2 text-center text-sm font-semibold text-white hover:bg-[var(--color-accent-soft)]"
                  >
                    Open Full Tafseer
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Surah Info */}
        <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-muted-text)]">
          <p>
            <strong>Surah:</strong> {surahName} (Surah {surahId})
          </p>
          <p className="mt-1">
            <strong>Ayah:</strong> {ayahNumber} / {totalAyah}
          </p>
        </div>
      </aside>
    </>
  );
}
