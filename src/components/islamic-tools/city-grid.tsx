import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { PAKISTAN_CITIES } from '@/lib/islamic-cities';

interface CityGridProps {
  basePath: string;
  label?: string;
}

export default function CityGrid({ basePath, label = 'Select City' }: CityGridProps) {
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-semibold text-[var(--color-heading)]">
        {label}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {PAKISTAN_CITIES.map((city) => (
          <Link
            key={city.slug}
            href={`${basePath}/${city.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)] hover:shadow-[var(--shadow-soft)]"
          >
            <MapPin className="h-4 w-4 shrink-0 text-[var(--color-accent-soft)] transition group-hover:text-[var(--color-accent)]" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--color-heading)]">{city.name}</p>
              <p className="truncate text-xs text-[var(--color-muted-text)]">{city.province}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
