import Image from 'next/image';
import Link from 'next/link';
import {
  BookHeart,
  BookOpenText,
  Headphones,
  HeartHandshake,
  Instagram,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import InstagramAuthCard, {
  type InstagramAttribution,
} from '@/components/instagram/instagram-auth-card';
import InstagramThemeToggle from '@/components/instagram/instagram-theme-toggle';

import styles from './instagram-landing.module.css';

const benefits = [
  {
    title: 'Continue Your Journey',
    description: 'Continue from the Surah or Ayah you last read.',
    icon: BookOpenText,
  },
  {
    title: 'Save Your Favourites',
    description: 'Save your favourite Surahs and Ayahs to your account.',
    icon: BookHeart,
  },
  {
    title: 'Read & Listen',
    description: 'Read the Quran and listen to beautiful recitations.',
    icon: Headphones,
  },
];

export default function InstagramLanding({
  attribution,
}: {
  attribution: InstagramAttribution;
}) {
  return (
    <div className={`instagram-landing ${styles.landing}`}>
      <div className={styles.ambientGlow} aria-hidden="true" />
      <div className={styles.pattern} aria-hidden="true" />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <Link
          href="/"
          className="group inline-flex min-h-11 items-center gap-2.5 rounded-full pr-3 text-[var(--ig-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
          aria-label="Read Al Quran home"
        >
          <span className={styles.brandMark}>
            <Image
              src="/logos/logo1.png"
              alt=""
              width={38}
              height={38}
              sizes="38px"
              className="h-full w-full rounded-full object-cover"
            />
          </span>
          <span>
            <span className="block font-display text-lg font-semibold leading-none tracking-wide">
              Read Al Quran
            </span>
            <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.24em] text-[var(--ig-muted)]">
              Read · Listen · Reflect
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-[var(--ig-border)] bg-[var(--ig-surface)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ig-muted)] shadow-sm sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--ig-accent)]" aria-hidden="true" />
            Official community
          </span>
          <InstagramThemeToggle />
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
        <section
          className={`${styles.heroPanel} grid items-center gap-6 px-5 py-6 sm:px-8 sm:py-9 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:px-11 lg:py-11`}
          aria-labelledby="instagram-heading"
        >
          <div className={styles.revealOne}>
            <div className="mb-5 flex items-center sm:mb-6">
              <div className={styles.identityGroup} aria-label="Read Al Quran and Instagram community">
                <div className={styles.logoPortrait}>
                  <Image
                    src="/logos/logo1.png"
                    alt="Read Al Quran logo"
                    width={96}
                    height={96}
                    sizes="(max-width: 640px) 72px, 88px"
                    priority
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
                <div className={styles.identityConnection} aria-hidden="true">
                  <span />
                </div>
                <div
                  className={styles.instagramPortrait}
                  title="Syed Areesha"
                >
                  <Image
                    src="/instagram/syed-areesha.jpeg"
                    alt="Syed Areesha, Read Al Quran Instagram profile"
                    width={96}
                    height={96}
                    sizes="(max-width: 640px) 72px, 88px"
                    className="h-full w-full rounded-full object-cover object-top"
                  />
                </div>
                <span className={styles.instagramBadge} aria-hidden="true">
                  <Instagram className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="ml-4 min-w-0 sm:ml-5">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-[var(--ig-accent)] sm:text-[10px]">
                  From Instagram
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--ig-heading)] sm:text-base">
                  Syed Areesha
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ig-muted)] sm:text-xs">
                  Read Al Quran Instagram community
                </p>
              </div>
            </div>

            <div className={styles.communityBadge}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Official Read Al Quran Community
            </div>

            <h1
              id="instagram-heading"
              className={`${styles.greetingTitle} mt-4 font-display text-[2.25rem] font-semibold leading-[1.02] tracking-[-0.02em] text-[var(--ig-heading)] sm:mt-5 sm:text-5xl lg:text-[3.65rem]`}
            >
              Assalam o Alaikum{' '}
              <span className={styles.wavingHand} aria-hidden="true">👋</span>
            </h1>
            <p className="mt-4 max-w-xl text-base font-semibold leading-relaxed text-[var(--ig-text)] sm:text-lg">
              You&apos;ve arrived at Read Al Quran from Instagram.
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ig-muted)] sm:text-[0.95rem] sm:leading-7">
              Read, listen, and keep your Quran journey connected to your account.
            </p>

            <div className="mt-5 flex items-center gap-3 text-xs font-semibold text-[var(--ig-muted)] sm:mt-6">
              <span className="h-px w-10 bg-[linear-gradient(90deg,var(--ig-accent),transparent)]" />
              <span lang="ar" className="font-arabic text-lg text-[var(--ig-accent)]">
                بِسْمِ اللَّهِ
              </span>
              <span className="h-px w-10 bg-[linear-gradient(90deg,transparent,var(--ig-accent))]" />
            </div>
          </div>

          <div className={styles.revealTwo}>
            <InstagramAuthCard attribution={attribution} />
          </div>
        </section>

        <section className="py-12 sm:py-16" aria-labelledby="journey-benefits-heading">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[var(--ig-accent)]">
              A thoughtful companion
            </p>
            <h2
              id="journey-benefits-heading"
              className="mt-3 font-display text-3xl font-semibold text-[var(--ig-heading)] sm:text-4xl"
            >
              Your Quran journey, beautifully connected
            </h2>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {benefits.map(({ title, description, icon: Icon }, index) => (
              <article
                key={title}
                className={`${styles.benefitCard} ${styles[`reveal${index + 3}` as keyof typeof styles] ?? ''}`}
              >
                <span className={styles.benefitIcon}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-base font-bold text-[var(--ig-heading)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ig-muted)]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.trustCard} aria-labelledby="made-for-ummah-heading">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--ig-border-strong)] bg-[var(--ig-icon-bg)] text-[var(--ig-accent)] shadow-sm">
            <HeartHandshake className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--ig-accent)]">
              Our intention
            </p>
            <h2
              id="made-for-ummah-heading"
              className="mt-1 font-display text-2xl font-semibold text-[var(--ig-heading)] sm:text-3xl"
            >
              Made for the Ummah
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ig-muted)]">
              Read Al Quran exists to make reading, understanding, and listening to the Quran
              easier for everyone.
            </p>
          </div>
        </section>
      </div>

      <footer className="relative z-10 border-t border-[var(--ig-border)] bg-[var(--ig-footer)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-7 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-display text-lg font-semibold text-[var(--ig-heading)]"
          >
            <Image
              src="/logos/logo1.png"
              alt=""
              width={28}
              height={28}
              sizes="28px"
              className="h-7 w-7 rounded-full object-cover"
            />
            Read Al Quran
          </Link>

          <nav
            aria-label="Instagram landing footer"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-xs font-semibold text-[var(--ig-muted)]"
          >
            <Link href="/" className="hover:text-[var(--ig-accent)]">Home</Link>
            <Link href="/privacy-policy" className="hover:text-[var(--ig-accent)]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[var(--ig-accent)]">Terms</Link>
            <span
              className="inline-flex items-center gap-1.5 opacity-70"
              aria-label="Instagram profile link will be added after the official account is configured"
            >
              Instagram <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </nav>

          <p className="text-[11px] text-[var(--ig-muted)]">
            © {new Date().getFullYear()} Read Al Quran
          </p>
        </div>
      </footer>

    </div>
  );
}
