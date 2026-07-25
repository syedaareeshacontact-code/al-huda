import {
  BookHeart,
  BookOpenText,
  ExternalLink,
  HandHeart,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const values = [
  {
    title: 'Faith (Iman)',
    description: 'Living with belief in Allah and following the Prophetic way with sincerity.',
    icon: ShieldCheck,
    color: 'text-[var(--color-accent)]',
  },
  {
    title: 'Knowledge (Ilm)',
    description: 'Sharing clear, source-attributed Islamic learning in simple, practical language.',
    icon: BookOpenText,
    color: 'text-[var(--color-info)]',
  },
  {
    title: 'Compassion (Rahmah)',
    description: 'Encouraging gentleness, care, and good character in every interaction.',
    icon: HandHeart,
    color: 'text-[var(--color-highlight)]',
  },
  {
    title: 'Consistency (Istiqamah)',
    description: 'Building habits of remembrance, recitation, and reflection over time.',
    icon: BookHeart,
    color: 'text-[var(--color-accent)]',
  },
];

const dataSources = [
  {
    title: 'Quran.com',
    label: 'Quran & Tafseer data',
    description:
      'Quran text, chapter details, translations, recitation information, and tafseer content are powered by the Quran.com APIs.',
    href: 'https://quran.com',
    icon: BookOpenText,
    color: 'text-[var(--color-accent)]',
  },
  {
    title: 'Hadith API',
    label: 'Hadith data',
    description:
      'Hadith collections and narration data displayed in the Hadith section are provided through the Hadith API.',
    href: 'https://hadithapi.com/',
    icon: ScrollText,
    color: 'text-[var(--color-info)]',
  },
];

export default function AboutRoot() {
  return (
    <div className="pb-16 pt-10" data-slot="page-shell">
      <section className="mb-8 animate-fade-up">
        <Badge className="mb-2">
          <Sparkles className="mr-1 size-3.5" />
          About Read al Quran
        </Badge>
        <h1 className="font-display text-4xl text-[var(--color-heading)]">Our Mission & Vision</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
          Read al Quran is built to make source-attributed Islamic content easier to read and revisit.
          We focus on a respectful user experience so Quran recitation and reflection stay
          accessible on every device.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="animate-fade-up border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)]">
          <CardHeader>
            <CardTitle className="text-2xl">Mission</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
            Provide a clean and practical Islamic app where users can read Quran with focus,
            save progress, and access source-linked reminders without clutter.
          </CardContent>
        </Card>
        <Card className="animate-fade-up-delay-1 border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_62%)] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_95%))]">
          <CardHeader>
            <CardTitle className="text-2xl">Vision</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
            Become a trusted companion for Muslims worldwide by combining sound content,
            thoughtful design, and strong accessibility across devices.
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-3xl text-[var(--color-heading)]">Core Values</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <Card
                key={value.title}
                className="animate-fade-up border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_64%)] bg-[linear-gradient(155deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-highlight),var(--color-surface)_96%))]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader>
                  <CardTitle className="inline-flex items-center gap-2 text-lg">
                    <Icon className={`size-5 ${value.color}`} />
                    {value.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-[var(--color-muted-text)]">
                  {value.description}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="data-sources-heading">
        <div className="max-w-3xl">
          <Badge className="mb-3">Content attribution</Badge>
          <h2 id="data-sources-heading" className="font-display text-3xl text-[var(--color-heading)]">
            Content &amp; Data Sources
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-text)] sm:text-base">
            We clearly credit the services that make Quran, Tafseer, and Hadith content available
            in this app.
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {dataSources.map((source, index) => {
            const Icon = source.icon;

            return (
              <Card
                key={source.title}
                className="animate-fade-up overflow-hidden border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[linear-gradient(145deg,var(--color-surface),color-mix(in_oklab,var(--color-accent),var(--color-surface)_97%))]"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex items-center gap-2">
                      <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-surface-2)]">
                        <Icon className={`size-5 ${source.color}`} />
                      </span>
                      <div>
                        <CardTitle className="text-xl">{source.title}</CardTitle>
                        <p className="mt-0.5 text-xs font-medium text-[var(--color-accent)]">
                          {source.label}
                        </p>
                      </div>
                    </div>
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Visit ${source.title}`}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted-text)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-[var(--color-muted-text)]">
                  {source.description}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-xs leading-relaxed text-[var(--color-muted-text)] sm:text-sm">
          English Quran translation uses Sahih International (resource 20), while the Urdu
          translation uses Fatah Muhammad Jalandhari (resource 234). Tafseer pages display the
          source name supplied by Quran.com. Read al Quran does not claim that every page has been
          independently reviewed by an appointed scholar; consult qualified scholars for religious
          guidance.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/editorial-policy" className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-accent)] hover:border-[var(--color-accent-soft)]">
            Editorial &amp; source policy
          </Link>
          <Link href="/corrections" className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-accent)] hover:border-[var(--color-accent-soft)]">
            Report a correction
          </Link>
        </div>
      </section>
    </div>
  );
}
