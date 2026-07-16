import Link from 'next/link';

interface TrustSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

export default function TrustPage({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: TrustSection[];
}) {
  return (
    <div className="pb-16 pt-10" data-slot="page-shell">
      <article className="mx-auto max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Trust &amp; transparency
        </p>
        <h1 className="mt-2 font-display text-4xl text-[var(--color-heading)] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--color-muted-text)]">
          {intro}
        </p>
        <p className="mt-3 text-xs text-[var(--color-muted-text)]">Last updated: {updated}</p>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
            >
              <h2 className="font-display text-2xl font-semibold text-[var(--color-heading)]">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.items ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm text-[var(--color-muted-text)]">
          Questions or corrections? Use the <Link className="font-semibold text-[var(--color-accent)] hover:underline" href="/feedback">feedback form</Link> or{' '}
          <Link className="font-semibold text-[var(--color-accent)] hover:underline" href="/contact">contact us</Link>.
        </p>
      </article>
    </div>
  );
}
