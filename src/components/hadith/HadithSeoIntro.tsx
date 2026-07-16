import Link from 'next/link';
import { BookMarked, Languages, Library, Search } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

const FEATURES = [
  {
    icon: Library,
    title: 'Major Collections',
    description: 'Browse Sahih al-Bukhari, Sahih Muslim, the major Sunan works, and Mishkat al-Masabih.',
  },
  {
    icon: Languages,
    title: 'Arabic, English & Urdu',
    description: 'Read each hadith in Arabic with English and Urdu translations side by side.',
  },
  {
    icon: Search,
    title: 'Keyword Search',
    description: 'Find hadiths by topic, narrator, or phrase across all major collections instantly.',
  },
  {
    icon: BookMarked,
    title: 'Chapter Navigation',
    description: 'Browse by book and chapter to explore hadiths organized by Islamic topics.',
  },
] as const;

const POPULAR_COLLECTIONS = [
  { slug: 'sahih-bukhari', label: 'Sahih al-Bukhari' },
  { slug: 'sahih-muslim', label: 'Sahih Muslim' },
  { slug: 'abu-dawood', label: 'Sunan Abu Dawud' },
  { slug: 'al-tirmidhi', label: 'Jami at-Tirmidhi' },
  { slug: 'sunan-nasai', label: 'Sunan an-Nasa\'i' },
  { slug: 'ibn-e-majah', label: 'Sunan Ibn Majah' },
] as const;

export default function HadithSeoIntro() {
  return (
    <section aria-labelledby="hadith-about-heading" className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="border-[var(--color-border)]">
            <CardContent className="flex gap-4 p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] text-[var(--color-accent-soft)]">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-heading)]">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-text)]">
                  {description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 md:p-8">
        <h2
          id="hadith-about-heading"
          className="font-display text-2xl font-bold text-[var(--color-heading)]"
        >
          Read Hadith Online
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--color-muted-text)] md:text-base">
          <p>
            Hadith are the recorded sayings, actions, and approvals of Prophet Muhammad (peace be upon
            him). They form the second primary source of Islamic guidance after the Quran and help
            Muslims understand how to practice faith in daily life.
          </p>
          <p>
            On Read al Quran, you can browse major hadith collections with Arabic text alongside
            English and Urdu translations. Grades, narrator information, and chapter context are
            shown where the data provider supplies them. Consult qualified scholars when a grading
            or religious ruling needs expert verification.
          </p>
        </div>

        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-text)]">
            Popular Collections
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {POPULAR_COLLECTIONS.map(({ slug, label }) => (
              <li key={slug}>
                <Link
                  href={`/hadith/${slug}`}
                  className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-accent-soft)] hover:text-[var(--color-accent-soft)]"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </section>
  );
}
