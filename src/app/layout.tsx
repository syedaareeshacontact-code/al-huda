import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import {
	Manrope,
	Cormorant_Garamond,
	Amiri_Quran,
	Noto_Nastaliq_Urdu,
} from 'next/font/google';

import './globals.css';
import SiteHeader from '@/components/layout/site-header';
import SiteFooter from '@/components/layout/site-footer';
import ScrollProgress from '@/components/ui/ScrollProgress';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppSettingsProvider } from '@/components/providers/app-settings-provider';
import { GlobalQuranAudioProvider } from '@/components/providers/global-quran-audio-provider';
import FloatingMiniPlayer from '@/components/ui/floating-mini-player';
import { SuspenseBoundary } from '@/components/ui/suspense-boundary';
import DeferredAnalytics from '@/components/providers/deferred-analytics';
import AnalyticsConsent from '@/components/providers/analytics-consent';
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/seo';

// Dynamically import components that don't need to be critical for initial render
const ServiceWorkerRegister = dynamic(
	() => import('@/components/providers/service-worker-register')
);

const ActivityTrackerProvider = dynamic(
	() => import('@/components/providers/activity-tracker-provider')
);

const defaultSiteUrl = 'https://www.readalquran.online';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || defaultSiteUrl;
const siteOrigin = new URL(siteUrl);
const siteOriginString = siteOrigin.toString().replace(/\/$/, '');
const siteName = 'Read al Quran';
const siteDescription =
	'Read al Quran is a Quran-first web app for recitation, Urdu translation, bookmarks, audio playback, and progress tracking.';
const ogImage = '/og?kind=surah-index';
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

// Optimize font loading with preload strategy
const bodyFont = Manrope({
	subsets: ['latin'],
	variable: '--font-body',
	weight: ['400', '500', '600', '700'],
	display: 'optional',
	preload: true,
});

const displayFont = Cormorant_Garamond({
	subsets: ['latin'],
	variable: '--font-display',
	weight: ['500', '600', '700'],
	display: 'optional',
	preload: true,
});

const arabicQuran = Amiri_Quran({
	subsets: ['arabic'],
	variable: '--font-arabic-quran',
	weight: '400',
	display: 'swap',
	preload: false,
});

const urduNastaliq = Noto_Nastaliq_Urdu({
	subsets: ['arabic'],
	variable: '--font-urdu-nastaliq',
	weight: ['400', '500', '600', '700'],
	display: 'swap',
	preload: false,
});

export const metadata: Metadata = {
	metadataBase: siteOrigin,
	title: {
		default: 'Read al Quran | Read, Listen, and Learn',
		template: '%s | Read al Quran',
	},
	description: siteDescription,
	applicationName: 'Read al Quran',
	category: 'education',
	alternates: {
		canonical: siteOriginString,
		languages: {
			'x-default': siteOriginString,
		},
	},
	icons: {
		icon: [
			{ url: '/logos/favicon-48.png', type: 'image/png', sizes: '48x48' },
		],
		apple: [
			{ url: '/logos/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
		],
	},
	manifest: '/manifest.webmanifest',
	verification: {
		google: googleSiteVerification || undefined,
	},
	openGraph: {
		title: 'Read al Quran',
		description: siteDescription,
		url: '/',
		siteName,
		type: 'website',
		locale: 'en_US',
		images: [
			{
				url: ogImage,
				width: 1200,
				height: 630,
				alt: 'Read al Quran app preview',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Read al Quran',
		description: siteDescription,
		images: [ogImage],
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-image-preview': 'large',
			'max-snippet': -1,
			'max-video-preview': -1,
		},
	},
};

export const viewport: Viewport = {
	colorScheme: 'dark light',
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#fafafa' },
		{ media: '(prefers-color-scheme: dark)', color: '#09090b' },
	],
};

const organizationJsonLd = buildOrganizationJsonLd();

const websiteJsonLd = buildWebsiteJsonLd();

const themeInitScript = `
(function() {
  try {
    var themeMode = window.localStorage.getItem('alhuda:theme-mode') || 'dark';
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var shouldUseDark = themeMode === 'dark' || (themeMode === 'system' && systemDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
    document.documentElement.style.colorScheme = shouldUseDark ? 'dark' : 'light';
  } catch (error) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			data-arabic-font="uthmaniHafs"
			suppressHydrationWarning
		>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
				{/* Resolve optional APIs cheaply; only the visible Quran font is preconnected. */}
				<link rel="dns-prefetch" href="//api.quran.com" />
				<link rel="preconnect" href="https://verses.quran.foundation" crossOrigin="anonymous" />
				<link rel="dns-prefetch" href="//hadithapi.com" />
				<link rel="dns-prefetch" href="//ia801503.us.archive.org" />
			</head>
			<body
				className={`${bodyFont.variable} ${displayFont.variable} ${arabicQuran.variable} ${urduNastaliq.variable} font-body`}
			>
				{/* Structured data - critical for SEO */}
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(organizationJsonLd),
					}}
				/>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(websiteJsonLd),
					}}
				/>

				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem
				>
					<AppSettingsProvider>
						<GlobalQuranAudioProvider>
						{/* Skip to main content link for accessibility */}
						<a
							href="#main-content"
							className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--color-accent)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--color-accent-foreground)]"
						>
							Skip to main content
						</a>

						{/* Critical rendering path components */}
						<ScrollProgress />
						<SiteHeader />

						{/* Main content */}
						<main
							id="main-content"
							className="min-h-[calc(100vh-4rem)]"
						>
							{children}
						</main>

						<SiteFooter />

						{/* Non-critical components loaded with suspense */}
						<SuspenseBoundary fallback={null} name="service-worker">
							<ServiceWorkerRegister />
						</SuspenseBoundary>

						<SuspenseBoundary fallback={null} name="activity-tracker">
							<ActivityTrackerProvider />
						</SuspenseBoundary>

						<FloatingMiniPlayer />
						</GlobalQuranAudioProvider>
					</AppSettingsProvider>
				</ThemeProvider>

				<AnalyticsConsent />
				<DeferredAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ''} />
			</body>
		</html>
	);
}
