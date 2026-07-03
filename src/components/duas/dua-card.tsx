'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, Search } from 'lucide-react';
import type { Dua } from '@/lib/ummah-api';

interface DuaCardProps {
  dua: Dua;
}

export default function DuaCard({ dua }: DuaCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = `${dua.title}\n\n${dua.arabic}\n\n${dua.transliteration}\n\n${dua.translation}\n\n— ${dua.source}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden transition hover:shadow-[var(--shadow-card)]">
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-[var(--color-heading)]">
            {dua.title}
          </h3>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy dua"
            className="shrink-0 rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-muted-text)] transition hover:border-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <p className="arabic-font mb-4 text-right text-2xl leading-loose text-[var(--color-heading)]" dir="rtl">
          {dua.arabic}
        </p>

        <p className="mb-3 text-sm italic leading-relaxed text-[var(--color-accent-soft)]">
          {dua.transliteration}
        </p>

        <p className="mb-4 text-sm leading-relaxed text-[var(--color-muted-text)]">
          {dua.translation}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-muted-text)]">
            {dua.source}
          </span>
          {dua.repeat && dua.repeat > 1 && (
            <span className="rounded-full bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
              Repeat ×{dua.repeat}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DuaCategoryGridProps {
  categories: Array<{ id: string; name: string; description: string; count: number }>;
  basePath?: string;
}

export function DuaCategoryGrid({ categories, basePath = '/duas' }: DuaCategoryGridProps) {
  const [search, setSearch] = useState('');

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  const categoryIcons: Record<string, string> = {
    morning: '🌅',
    evening: '🌆',
    wudu: '💧',
    prayer: '🕌',
    after_prayer: '📿',
    sleep: '😴',
    food: '🍽️',
    travel: '✈️',
    home: '🏠',
    masjid: '🕌',
    distress: '🤲',
    forgiveness: '💚',
    illness: '🏥',
    dhikr: '📿',
    protection: '🛡️',
    night_prayer: '🌙',
    hajj: '🕋',
    quran_recitation: '📖',
  };

  return (
    <div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
        <input
          type="search"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--color-accent-soft)] focus:ring-2 focus:ring-[var(--color-ring)]"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((cat) => (
          <Link
            key={cat.id}
            href={`${basePath}/${cat.id}`}
            className="group flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent-soft)] hover:shadow-[var(--shadow-soft)]"
          >
            <span className="text-2xl">{categoryIcons[cat.id] ?? '🤲'}</span>
            <div>
              <p className="font-semibold text-[var(--color-heading)] group-hover:text-[var(--color-accent-soft)]">
                {cat.name}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-text)]">{cat.description}</p>
              <p className="mt-2 text-xs font-semibold text-[var(--color-accent)]">{cat.count} duas</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
