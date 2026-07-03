import { Badge } from '@/components/ui/badge';

interface IslamicPageHeaderProps {
  badge?: string;
  badgeSecondary?: string;
  title: string;
  titleUrdu?: string;
  description?: string;
  meta?: React.ReactNode;
}

export default function IslamicPageHeader({
  badge = 'Islamic Tools',
  badgeSecondary,
  title,
  titleUrdu,
  description,
  meta,
}: IslamicPageHeaderProps) {
  return (
    <header className="relative mb-10 overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_30%)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-surface),var(--color-accent)_6%),var(--color-surface))] p-8 shadow-[var(--shadow-soft)] md:p-10">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-[0.07]"
        style={{
          background:
            'radial-gradient(circle, var(--color-accent-soft) 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full opacity-[0.05]"
        style={{
          background:
            'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
        }}
      />

      <div className="relative">
        <div className="mb-4 inline-flex flex-wrap items-center gap-2">
          <Badge className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-soft)] text-[var(--color-accent-foreground)]">
            {badge}
          </Badge>
          {badgeSecondary ? (
            <Badge variant="secondary" className="text-xs">
              {badgeSecondary}
            </Badge>
          ) : null}
        </div>

        <h1 className="font-display text-3xl font-bold text-[var(--color-heading)] md:text-5xl">
          {title}
        </h1>

        {titleUrdu ? (
          <p className="urdu-font mt-2 text-2xl text-[var(--color-accent-soft)] md:text-3xl" dir="rtl">
            {titleUrdu}
          </p>
        ) : null}

        {description ? (
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--color-muted-text)] md:text-lg">
            {description}
          </p>
        ) : null}

        {meta ? <div className="mt-5">{meta}</div> : null}
      </div>
    </header>
  );
}
