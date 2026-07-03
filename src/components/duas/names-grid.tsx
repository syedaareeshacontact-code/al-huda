'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { AsmaUlHusna } from '@/lib/ummah-api';

interface NamesGridProps {
  names: AsmaUlHusna[];
}

export default function NamesGrid({ names }: NamesGridProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AsmaUlHusna | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return names;
    return names.filter(
      (n) =>
        n.transliteration.toLowerCase().includes(q) ||
        n.english.toLowerCase().includes(q) ||
        n.meaning.toLowerCase().includes(q) ||
        String(n.number).includes(q)
    );
  }, [names, search]);

  return (
    <div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
        <input
          type="search"
          placeholder="Search by name, meaning, or number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--color-accent-soft)] focus:ring-2 focus:ring-[var(--color-ring)]"
        />
      </div>

      {selected && (
        <Card className="mb-6 border-[var(--color-accent-soft)] shadow-[var(--shadow-glow)]">
          <CardContent className="p-6 text-center">
            <p className="text-sm font-semibold text-[var(--color-accent)]">#{selected.number}</p>
            <p className="arabic-font mt-3 text-4xl text-[var(--color-heading)]" dir="rtl">
              {selected.arabic}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-[var(--color-heading)]">
              {selected.transliteration}
            </p>
            <p className="mt-1 text-lg text-[var(--color-accent-soft)]">{selected.english}</p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted-text)]">
              {selected.meaning}
            </p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-4 text-xs text-[var(--color-muted-text)] underline"
            >
              Close
            </button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((name) => (
          <button
            key={name.number}
            type="button"
            onClick={() => setSelected(name)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-accent-soft)] hover:shadow-[var(--shadow-soft)]"
          >
            <p className="text-xs font-bold text-[var(--color-accent)]">#{name.number}</p>
            <p className="arabic-font mt-2 text-xl text-[var(--color-heading)]" dir="rtl">
              {name.arabic}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-heading)]">
              {name.transliteration}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted-text)]">{name.english}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
