'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Heart,
  LogIn,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Star,
  Sun,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AuthTab,
  OpenAuthModalDetail,
  SessionUser,
} from '@/components/layout/auth-modal';
import IslamicTopBanner from '@/components/layout/islamic-top-banner';
import {
  flattenMegaNavLinks,
  getMobileMegaNavColumns,
  HOME_NAV,
  MEGA_NAV_GROUPS,
  type MegaNavGroup,
  type NavLinkItem,
} from '@/lib/navigation-config';
import { AUTH_CHANGED_EVENT } from '@/lib/quran-user-state';
import { cn } from '@/lib/utils';
import { useAppSettings } from '@/components/providers/app-settings-provider';
import { getClientSession, invalidateClientSession } from '@/lib/client-session';
import { clearPendingProtectedDownload } from '@/lib/protected-download-client';

const AuthModal = dynamic(() => import('@/components/layout/auth-modal'), {
  ssr: false,
});

const NotificationCenter = dynamic(
  () => import('@/components/notifications/notification-center'),
  { ssr: false }
);

const GuestPushEnrollment = dynamic(
  () => import('@/components/notifications/guest-push-enrollment'),
  { ssr: false }
);

const SiteDeviceVisitTracker = dynamic(
  () => import('@/components/engagement/site-device-visit-tracker'),
  { ssr: false }
);

const NAV_LINK_BASE =
  'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]';

const NAV_LINK_INACTIVE =
  'text-[var(--color-muted-text)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]';

const NAV_LINK_ACTIVE =
  'border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] text-[var(--color-accent-soft)] shadow-[var(--shadow-soft)]';

const OPEN_AUTH_MODAL_EVENT = 'alhuda:open-auth-modal';

function ThemeBtn() {
  const { themeMode, setThemeMode, isLoaded } = useAppSettings();
  const isDark = themeMode === 'dark';

  return (
    <button
      type="button"
      onClick={() => isLoaded && setThemeMode(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-muted-text)] transition hover:border-[var(--color-accent-soft)] hover:text-[var(--color-heading)]"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function UserAvatar({ user, size = 'sm' }: { user: SessionUser; size?: 'sm' | 'md' }) {
  const dimensionClass = size === 'md' ? 'h-8 w-8 rounded-lg text-xs' : 'h-6 w-6 rounded-md text-[10px]';

  if (user.imageUrl) {
    return (
      <Image
        src={user.imageUrl}
        alt=""
        width={size === 'md' ? 32 : 24}
        height={size === 'md' ? 32 : 24}
        unoptimized
        referrerPolicy="no-referrer"
        className={cn(dimensionClass, 'shrink-0 object-cover')}
      />
    );
  }

  return (
    <span
      className={cn(
        dimensionClass,
        'flex shrink-0 items-center justify-center bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_80%)] font-bold text-[var(--color-accent-soft)]'
      )}
    >
      {user.name.charAt(0).toUpperCase()}
    </span>
  );
}

function NavLinkCard({
  item,
  active,
  onNavigate,
  compact = false,
}: {
  item: NavLinkItem;
  active: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const ItemIcon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex gap-3 rounded-xl border p-3 transition',
        active
          ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] shadow-[var(--shadow-soft)]'
          : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)]'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
          active
            ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_78%)] text-[var(--color-accent)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-muted-text)] group-hover:text-[var(--color-accent)]'
        )}
      >
        <ItemIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className={cn('font-semibold', active ? 'text-[var(--color-accent-soft)]' : 'text-[var(--color-heading)]')}>
            {item.label}
          </span>
          {item.badge && (
            <span className="rounded-full border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_82%)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent-soft)]">
              {item.badge}
            </span>
          )}
        </span>
        <span
          className={cn(
            'mt-0.5 block text-xs leading-snug text-[var(--color-muted-text)]',
            compact && 'line-clamp-2'
          )}
        >
          {item.description}
        </span>
      </span>
    </Link>
  );
}

function MegaMenuPanel({
  group,
  onNavigate,
  showAdminLink,
}: {
  group: MegaNavGroup;
  onNavigate: () => void;
  showAdminLink: boolean;
}) {
  const pathname = usePathname();

  const linkActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const menuColumns =
    group.id === 'explore' && showAdminLink
      ? [
          ...group.columns,
          {
            title: 'Admin',
            items: [
              {
                label: 'Admin Dashboard',
                description: 'Restricted access for site administration',
                href: '/admin',
                icon: ShieldCheck,
                exact: true,
              },
            ],
          },
        ]
      : group.columns;

  return (
    <div
      className="absolute left-0 right-0 top-full z-[120] w-full border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
      role="region"
      aria-label={`${group.label} menu`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-accent),transparent)] opacity-40" />

          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        {group.highlight && (
          <div className="w-full shrink-0 rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-accent),var(--color-surface)_90%),var(--color-surface-elevated))] p-4 sm:p-5 lg:w-[32%] lg:max-w-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
              Featured
            </p>
            <h3 className="mt-2 font-display text-2xl text-[var(--color-heading)]">{group.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-text)]">{group.tagline}</p>
            <div className="mt-4">
              <NavLinkCard
                item={group.highlight}
                active={linkActive(group.highlight.href, group.highlight.exact)}
                onNavigate={onNavigate}
              />
            </div>
          </div>
        )}

        <div
          className={cn(
            'grid w-full flex-1 grid-cols-1 gap-5',
            group.columns.length >= 3 ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'
          )}
        >
          {menuColumns.map((column) => (
            <div key={column.title} className="min-w-0">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted-text)]">
                {column.title}
              </p>
              <div className="flex flex-col gap-1">
                {column.items.map((item) => (
                  <NavLinkCard
                    key={item.href + item.label}
                    item={item}
                    active={linkActive(item.href, item.exact)}
                    onNavigate={onNavigate}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMegaId, setOpenMegaId] = useState<string | null>(null);
  const [openMobileSectionId, setOpenMobileSectionId] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>('signin');
  const [authReason, setAuthReason] = useState<string | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollYRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);

  const pathSegments = pathname.split('/').filter(Boolean);
  const isSurahReaderPage =
    pathSegments.length === 2 && pathSegments[0] === 'surah';
  const isHadithDetailPage = /^\/hadith\/[^/]+\/books\/[^/]+\/[^/]+\/?$/.test(pathname);
  const isHadithScrollAwarePage = pathSegments[0] === 'hadith';
  const isScrollAwareHeaderPage =
    isSurahReaderPage ||
    (pathSegments.length === 1 && (pathSegments[0] === 'surah' || pathSegments[0] === 'tafsir')) ||
    isHadithScrollAwarePage;
  const keepHeaderOpen = mobileOpen || Boolean(openMegaId) || authModalOpen;

  useEffect(() => {
    setMobileOpen(false);
    setOpenMegaId(null);
    setOpenMobileSectionId(null);
    setHeaderVisible(true);
  }, [pathname]);

  useEffect(() => {
    if (!isScrollAwareHeaderPage || keepHeaderOpen) {
      setHeaderVisible(true);
      return;
    }

    lastScrollYRef.current = Math.max(window.scrollY, 0);

    const syncVisibility = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY <= 16) {
        setHeaderVisible(true);
        lastScrollYRef.current = currentScrollY;
      } else if (scrollDelta >= 8) {
        setHeaderVisible(false);
        lastScrollYRef.current = currentScrollY;
      } else if (scrollDelta <= -8) {
        setHeaderVisible(true);
        lastScrollYRef.current = currentScrollY;
      }

      scrollFrameRef.current = null;
    };

    const onScroll = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = window.requestAnimationFrame(syncVisibility);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [isScrollAwareHeaderPage, keepHeaderOpen]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const syncHeaderHeight = () => {
      const headerHeight = `${header.offsetHeight}px`;
      document.documentElement.style.setProperty(
        '--site-header-height',
        headerHeight
      );
      document.documentElement.style.setProperty(
        '--site-header-visible-offset',
        headerVisible ? headerHeight : '0px'
      );
    };

    syncHeaderHeight();
    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [headerVisible]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setAuthLoading(true);
        const data = (await getClientSession()) as { user: SessionUser | null };
        if (!ignore) setSessionUser(data.user ?? null);
      } catch {
        if (!ignore) setSessionUser(null);
      } finally {
        if (!ignore) setAuthLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!openMegaId) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenMegaId(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMegaId(null);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMegaId]);

  const openAuthModal = useCallback((tab: AuthTab, reason?: string) => {
    setAuthTab(tab);
    setAuthReason(reason ?? null);
    setAuthModalOpen(true);
    setMobileOpen(false);
    setOpenMegaId(null);
  }, []);

  const closeAuthModal = useCallback(() => {
    clearPendingProtectedDownload();
    setAuthModalOpen(false);
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const customEvent = event as CustomEvent<OpenAuthModalDetail>;
      openAuthModal(customEvent.detail?.tab === 'signup' ? 'signup' : 'signin', customEvent.detail?.reason);
    };
    window.addEventListener(OPEN_AUTH_MODAL_EVENT, onOpen as EventListener);
    return () => window.removeEventListener(OPEN_AUTH_MODAL_EVENT, onOpen as EventListener);
  }, [openAuthModal]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } finally {
      invalidateClientSession();
      setSessionUser(null);
      setMobileOpen(false);
      setAuthModalOpen(false);
      window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
      window.location.reload();
    }
  };

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const isMegaGroupActive = (group: MegaNavGroup) =>
    flattenMegaNavLinks(group).some((item) => isActive(item.href, item.exact));

  const HomeIcon = HOME_NAV.icon;
  const openMegaGroup = MEGA_NAV_GROUPS.find((group) => group.id === openMegaId) ?? null;
  const showAdminLink = Boolean(sessionUser?.isAdmin);

  return (
    <>
      <GuestPushEnrollment
        isAuthenticated={Boolean(sessionUser)}
        sessionReady={!authLoading}
      />
      <SiteDeviceVisitTracker sessionReady={!authLoading} />
      <header
        ref={headerRef}
        data-site-header
        onFocusCapture={() => {
          if (isScrollAwareHeaderPage) setHeaderVisible(true);
        }}
        className={cn(
          'sticky top-0 z-[100] transform-gpu transition-transform duration-300 ease-out will-change-transform',
          isScrollAwareHeaderPage && !headerVisible && '-translate-y-full pointer-events-none'
        )}
      >
        {!isSurahReaderPage ? (
          <div className={isHadithDetailPage ? 'hidden md:block' : undefined}>
            <IslamicTopBanner />
          </div>
        ) : null}

        <div className="relative border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-bg),transparent_6%)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-accent),transparent)] opacity-45" />

          <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
            <Link href="/" prefetch={false} className="flex min-w-0 shrink-0 items-center gap-2.5 no-underline sm:gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(140deg,var(--color-accent-soft),var(--color-accent))] text-[var(--color-accent-foreground)] shadow-[var(--shadow-soft)]">
                <Star className="h-4 w-4" />
              </span>
              <div className="min-w-0 leading-none">
                <span className="block truncate font-display text-base font-semibold tracking-wide text-[var(--color-heading)] sm:text-lg">
                  Read al Quran
                </span>
                <span className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-accent-soft)] sm:block">
                  Quran · Hadith · Tafseer
                </span>
              </div>
            </Link>

            <nav className="relative hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
              <Link
                href={HOME_NAV.href}
                prefetch={false}
                aria-current={isActive(HOME_NAV.href, HOME_NAV.exact) ? 'page' : undefined}
                className={cn(NAV_LINK_BASE, isActive(HOME_NAV.href, HOME_NAV.exact) ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE)}
              >
                <HomeIcon className="h-4 w-4" />
                {HOME_NAV.label}
              </Link>

              {MEGA_NAV_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                const active = isMegaGroupActive(group);
                const open = openMegaId === group.id;

                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-expanded={open}
                    aria-haspopup="true"
                    onClick={() => setOpenMegaId(open ? null : group.id)}
                    className={cn(NAV_LINK_BASE, active || open ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE)}
                  >
                    <GroupIcon className="h-4 w-4" />
                    {group.label}
                    <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
                  </button>
                );
              })}

            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/donate"
                prefetch={false}
                aria-label="Donate to Read al Quran"
                aria-current={isActive('/donate', true) ? 'page' : undefined}
                className={cn(
                  'h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-sm font-semibold transition sm:px-3',
                  sessionUser ? 'hidden lg:inline-flex' : 'inline-flex',
                  isActive('/donate', true)
                    ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] text-[var(--color-accent-foreground)] shadow-[var(--shadow-soft)]'
                    : 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] text-[var(--color-accent-soft)] hover:bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] hover:text-[var(--color-accent-foreground)]'
                )}
              >
                <Heart className="h-4 w-4" />
                <span className="hidden min-[360px]:inline">Donate</span>
              </Link>

              <div className="hidden items-center gap-2 lg:flex">
                {authLoading ? (
                  <span className="text-xs text-[var(--color-muted-text)]">...</span>
                ) : sessionUser ? (
                  <>
                    <div
                      className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1.5"
                      title={sessionUser.name}
                    >
                      <UserAvatar user={sessionUser} />
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      aria-label="Sign out"
                      title="Sign out"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-muted-text)] hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuthModal('signin')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-muted-text)] hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </button>
                )}
              </div>

              <NotificationCenter isAuthenticated={Boolean(sessionUser)} />
              <ThemeBtn />

              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-muted-text)] hover:border-[var(--color-accent-soft)] hover:text-[var(--color-heading)] lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>
          </div>

          {openMegaGroup && (
            <MegaMenuPanel
              group={openMegaGroup}
              onNavigate={() => setOpenMegaId(null)}
              showAdminLink={showAdminLink}
            />
          )}
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="absolute inset-0 h-full w-full border-0 bg-black/55 backdrop-blur-[2px]"
          />

          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[min(100%,22rem)] flex-col border-l border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_50%)] bg-[var(--color-bg)] shadow-[0_0_60px_rgba(0,0,0,0.4)] animate-slide-in-right">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3.5">
              <Link href="/" prefetch={false} onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 no-underline">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] bg-[linear-gradient(140deg,var(--color-accent-soft),var(--color-accent))] text-[var(--color-accent-foreground)]">
                  <Star className="h-3.5 w-3.5" />
                </span>
                <span className="font-display text-base font-semibold text-[var(--color-heading)]">Read al Quran</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-muted-text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Mobile navigation">
              <div className="mb-3">
                <NavLinkCard
                  item={{
                    ...HOME_NAV,
                    description: 'Return to the main dashboard',
                  }}
                  active={isActive(HOME_NAV.href, HOME_NAV.exact)}
                  onNavigate={() => setMobileOpen(false)}
                  compact
                />
              </div>

              <div className="space-y-2">
                {MEGA_NAV_GROUPS.map((group) => {
                  const GroupIcon = group.icon;
                  const open = openMobileSectionId === group.id;
                  const active = isMegaGroupActive(group);
                  const mobileColumns = getMobileMegaNavColumns(group);
                  const sectionLinks = mobileColumns.flatMap((column) => column.items);
                  const panelId = `mobile-nav-section-${group.id}`;

                  return (
                    <section
                      key={group.id}
                      className={cn(
                        'overflow-hidden rounded-2xl border transition',
                        active || open
                          ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)]'
                      )}
                    >
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpenMobileSectionId(open ? null : group.id)}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[var(--color-surface-2)]"
                      >
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                            active || open
                              ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_78%)] text-[var(--color-accent)]'
                              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-text)]'
                          )}
                        >
                          <GroupIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block truncate text-sm font-semibold',
                              active || open ? 'text-[var(--color-accent-soft)]' : 'text-[var(--color-heading)]'
                            )}
                          >
                            {group.label}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--color-muted-text)]">
                            {group.tagline}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-muted-text)]">
                            {sectionLinks.length}
                          </span>
                          <ChevronDown className={cn('h-4 w-4 text-[var(--color-muted-text)] transition-transform', open && 'rotate-180')} />
                        </span>
                      </button>

                      {open && (
                        <div id={panelId} className="space-y-4 border-t border-[var(--color-border)] px-2 py-3">
                          {mobileColumns.map((column) => (
                            <div key={`${group.id}-${column.title}`} className="space-y-1">
                              <p className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted-text)]">
                                {column.title}
                              </p>
                              {column.items.map((item) => (
                                <NavLinkCard
                                  key={`${group.id}-${column.title}-${item.href}-${item.label}`}
                                  item={item}
                                  active={isActive(item.href, item.exact)}
                                  onNavigate={() => setMobileOpen(false)}
                                  compact
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-[var(--color-border)] p-4">
              <Link
                href="/donate"
                prefetch={false}
                onClick={() => setMobileOpen(false)}
                className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-soft)]"
              >
                <Heart className="h-4 w-4" />
                Donate to Read al Quran
              </Link>

              {authLoading ? (
                <p className="text-xs text-[var(--color-muted-text)]">Checking session...</p>
              ) : sessionUser ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2.5">
                    <UserAvatar user={sessionUser} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-heading)]">{sessionUser.name}</p>
                      <p className="truncate text-xs text-[var(--color-muted-text)]">{sessionUser.email}</p>
                    </div>
                  </div>
                  {sessionUser.isAdmin ? (
                    <Link
                      href="/admin"
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent)]"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Admin
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-muted-text)]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {showAdminLink ? (
                    <Link
                      href="/admin"
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_40%)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent)]"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Admin
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openAuthModal('signin')}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm font-semibold text-[var(--color-muted-text)]"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {authModalOpen ? (
        <AuthModal
          open
          onClose={closeAuthModal}
          onAuthenticated={setSessionUser}
          initialTab={authTab}
          reason={authReason}
          reloadOnAuthenticated={pathname !== '/instagram'}
        />
      ) : null}
    </>
  );
}
