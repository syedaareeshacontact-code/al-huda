import Link from 'next/link';
import { BookOpenText, Heart, Sparkles } from 'lucide-react';

import navLinks, { popularSurahLinks } from '@/lib/navLinks';

const exploreLinks = navLinks.filter((item) =>
  ['Home', 'Quran', 'Tafseer', 'Hadith', 'Read Online'].includes(item.name)
);

const supportLinks = [
  { name: 'About', link: '/about' },
  { name: 'Contact', link: '/contact' },
  { name: 'Feedback', link: '/feedback' },
  { name: 'Sources', link: '/editorial-policy' },
  { name: 'Corrections', link: '/corrections' },
  { name: 'Privacy', link: '/privacy-policy' },
  { name: 'Terms', link: '/terms' },
];

const MOBILE_LINK_ROW_CLASS =
  'flex flex-nowrap gap-5 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] sm:flex-col sm:gap-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden';

const FOOTER_LINK_CLASS =
  'group relative shrink-0 whitespace-nowrap text-sm text-gray-300 transition-colors duration-200 hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950';

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} prefetch={false} className={FOOTER_LINK_CLASS}>
      {children}
      <span
        className="absolute -bottom-0.5 left-0 h-px w-0 bg-emerald-400 transition-all duration-200 group-hover:w-full"
        aria-hidden="true"
      />
    </Link>
  );
}

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-emerald-800/50 bg-gradient-to-br from-emerald-950 via-green-950 to-slate-950 text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-0 size-80 rounded-full bg-teal-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-9">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_1fr_0.8fr] lg:gap-9">
          <section aria-labelledby="footer-about-title" className="max-w-md">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 shadow-[0_10px_30px_rgba(16,185,129,0.08)]">
                <BookOpenText className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Quranic Reflection
                </p>
                <h2 id="footer-about-title" className="mt-0.5 font-display text-xl font-bold text-white">
                  Read al Quran
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-300">
              Read, listen, understand, and reflect on the Quran through translations, tafseer,
              recitation audio, and focused study tools.
            </p>
          </section>

          <nav aria-labelledby="footer-explore-title" className="min-w-0">
            <h3 id="footer-explore-title" className="mb-3 text-sm font-bold text-white">
              Explore
            </h3>
            <div className={MOBILE_LINK_ROW_CLASS}>
              {exploreLinks.map((item) => (
                <FooterLink key={item.id} href={item.link}>
                  {item.name}
                </FooterLink>
              ))}
            </div>
          </nav>

          <nav aria-labelledby="footer-popular-title" className="min-w-0">
            <h3 id="footer-popular-title" className="mb-3 text-sm font-bold text-white">
              Popular Surahs
            </h3>
            <div className={MOBILE_LINK_ROW_CLASS}>
              {popularSurahLinks.map((item) => (
                <FooterLink key={item.link} href={item.link}>
                  {item.name}
                </FooterLink>
              ))}
            </div>
          </nav>

          <nav aria-labelledby="footer-support-title" className="min-w-0">
            <h3 id="footer-support-title" className="mb-3 text-sm font-bold text-white">
              Support
            </h3>
            <div className={MOBILE_LINK_ROW_CLASS}>
              {supportLinks.map((item) => (
                <FooterLink key={item.link} href={item.link}>
                  {item.name}
                </FooterLink>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-7 flex flex-col gap-2 border-t border-white/10 pt-4 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Read al Quran. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5">
            Made with
            <Heart className="size-3.5 fill-emerald-400 text-emerald-400" aria-hidden="true" />
            for the Ummah
          </p>
        </div>
      </div>
    </footer>
  );
}
