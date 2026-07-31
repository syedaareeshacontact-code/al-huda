import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Heart,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildPageMetadata } from '@/lib/seo';

const QR_IMAGE_PATH = '/donation/read-al-quran-easypaisa-qr.png';

export const metadata: Metadata = buildPageMetadata({
  title: 'Donate via Easypaisa – Support Read al Quran',
  description:
    'Support Read al Quran with a voluntary donation through Easypaisa. Scan or download the QR code and help us maintain and improve the platform.',
  path: '/donate',
});

const supportAreas = [
  {
    title: 'Keep access reliable',
    description: 'Help cover hosting, maintenance, and the services that keep the platform available.',
    icon: ShieldCheck,
  },
  {
    title: 'Improve the experience',
    description: 'Support accessibility improvements, performance work, and thoughtful new features.',
    icon: Sparkles,
  },
  {
    title: 'Grow beneficial resources',
    description: 'Help us continue organizing Quran, Hadith, Tafseer, and Islamic learning tools.',
    icon: Heart,
  },
];

const donationSteps = [
  'Open the Easypaisa app on your phone.',
  'Choose Scan QR and scan the code shown here, or download it to your device.',
  'Enter the amount you would like to contribute.',
  'Verify the recipient details and amount before confirming the payment.',
];

export default function DonatePage() {
  return (
    <div className="relative isolate overflow-hidden pb-20 pt-8 sm:pt-12" data-slot="page-shell">
      <div className="pointer-events-none absolute inset-x-8 top-12 -z-10 h-72 rounded-full bg-[color-mix(in_oklab,var(--color-accent),transparent_90%)] blur-3xl" />

      <section className="mx-auto max-w-3xl text-center" aria-labelledby="donation-heading">
        <Badge className="mb-4">
          <Heart className="mr-1 size-3.5 fill-current" />
          Support Read al Quran
        </Badge>
        <h1
          id="donation-heading"
          className="font-display text-4xl font-bold leading-tight text-[var(--color-heading)] sm:text-5xl lg:text-6xl"
        >
          Help us keep Quran learning accessible
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-muted-text)] sm:text-lg">
          Read al Quran is built to help people read, listen to, and study the Quran with clarity.
          Your voluntary support helps us maintain the platform and continue improving it for
          learners around the world.
        </p>
      </section>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(145deg,var(--color-surface-elevated),color-mix(in_oklab,var(--color-accent),var(--color-surface)_96%))] p-5 shadow-[var(--shadow-card)] sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]">
                <Heart className="size-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
                  Your support matters
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-[var(--color-heading)]">
                  Every contribution makes a difference
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {supportAreas.map((area) => {
                const Icon = area.icon;

                return (
                  <article
                    key={area.title}
                    className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                  >
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-accent)]">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-[var(--color-heading)]">{area.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-text)]">
                        {area.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent)]">
                <Smartphone className="size-5" />
              </span>
              <h2 className="font-display text-2xl font-semibold text-[var(--color-heading)]">
                How to donate with Easypaisa
              </h2>
            </div>

            <ol className="mt-5 space-y-4">
              {donationSteps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-[var(--color-muted-text)]">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-[var(--color-accent-foreground)]">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="order-first rounded-3xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_48%)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-card)] sm:p-5 lg:order-last lg:sticky lg:top-[calc(var(--site-header-height,7rem)+1.5rem)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
                Easypaisa donation
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-[var(--color-heading)]">
                Scan to support
              </h2>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_84%)] text-[var(--color-accent)]">
              <QrCode className="size-5" />
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-2">
            <Image
              src={QR_IMAGE_PATH}
              alt="Easypaisa QR code for donating to Read al Quran"
              width={1236}
              height={1272}
              priority
              sizes="(max-width: 1024px) 92vw, 420px"
              className="h-auto w-full rounded-xl"
            />
          </div>

          <Button asChild size="lg" className="mt-4 w-full">
            <a href={QR_IMAGE_PATH} download="read-al-quran-easypaisa-qr.png">
              <Download className="size-4" />
              Download QR code
            </a>
          </Button>

          <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-heading)]">
              <CheckCircle2 className="size-4 shrink-0 text-[var(--color-accent)]" />
              Check before you confirm
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted-text)]">
              Always verify the recipient details and payment amount inside Easypaisa. We will
              never ask for your PIN, password, or one-time verification code.
            </p>
          </div>
        </aside>
      </div>

      <section className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center sm:p-7">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-heading)]">
            Need help with your donation?
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--color-muted-text)]">
            Contributions are voluntary. Contact us if you have a payment question or need help
            with the QR code.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/contact">
            Contact us
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
