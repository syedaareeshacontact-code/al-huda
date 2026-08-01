# Read Al Quran: Project Reference

This is the authoritative technical context for developers and AI tools working
on the project. It describes the current repository; code and configuration
remain the final source of truth.

## Product scope

Read Al Quran is an Islamic content and utility platform focused on the Quran.
Its main domains are:

- Quran reading, Urdu translation and tafsir, recitation, Urdu audio, search,
  user reading state, and downloadable Surah PDFs
- Hadith browsing and search
- Duas, azkar, and the 99 Names of Allah
- Prayer times, Hijri dates, Qibla direction, mosque discovery, and Zakat
- Authentication, preferences, notifications, feedback, activity summaries,
  and administration
- Search-engine discovery through canonical URLs, structured data, and
  segmented sitemaps

## Architecture

| Layer | Main locations | Responsibility |
| --- | --- | --- |
| Pages and route handlers | `src/app` | Next.js App Router pages, layouts, metadata, sitemaps, and HTTP APIs |
| UI | `src/components` | Feature components, reusable UI, navigation, providers, and players |
| Domain/server logic | `src/lib` | Quran, Hadith, auth, database, SEO, Islamic tools, push, and PDF logic |
| Client state | `src/context`, `src/hooks` | Surah context and reusable browser hooks |
| Static/generated data | `src/data` | Surah index, fallback list, and tafsir availability |
| Shared contracts | `src/types` | Quran, player, settings, notification, and breadcrumb types |
| Public assets | `public` | PWA files, branding, banners, basmalah image, and generated PDFs |
| Maintenance scripts | `scripts` | SEO data generation, PDF generation, RTL helpers, and security checks |

The project uses React Server Components by default. Interactive readers,
players, forms, settings, geolocation, and browser storage are implemented in
client components. Route handlers isolate server credentials and database work.

## Public route groups

| Area | Routes |
| --- | --- |
| Home and trust | `/`, `/about`, `/contact`, `/feedback`, `/corrections`, `/editorial-policy`, `/privacy-policy`, `/terms` |
| Quran | `/surah`, `/surah/[surah]`, `/surah/[surah]/ayah/[ayah]`, `/surah/[surah]/download`, `/read-quran-online` |
| Tafsir | `/tafsir`, `/tafsir/[surah]`, `/tafsir/[surah]/[ayah]` |
| Hadith | `/hadith`, collection/book/Hadith detail routes, and `/hadith/search` |
| Worship content | `/duas`, `/duas/[category]`, `/azkar`, `/99-names-of-allah` |
| Islamic tools | `/prayer-times`, `/prayer-times/[city]`, `/mosque-finder`, `/mosque-finder/[city]`, `/zakat-calculator` |
| Account/admin | Authentication is modal/API based; `/admin` and `/admin/users` are server-protected |
| Downloads | `/download` and authenticated files below `/surah-pdfs` |

Legacy `/quran` URLs redirect permanently to canonical `/surah` URLs.
Numeric Surah and tafsir paths are normalized to canonical slugs by
`src/proxy.ts`.

## Internal HTTP APIs

| Group | Endpoints and purpose |
| --- | --- |
| Authentication | `/api/auth/signup`, `signin`, `signout`, `google`, and `session` |
| User data | `/api/auth/quran-state`, `settings`, `notifications`, and `track` |
| Quran | `/api/quran/ayah`, `/api/quran/likes`, `/api/surah/[surahId]/content`, `audio`, `pdf`, and `/api/tafsir/ur` |
| Hadith/tools | `/api/hadith/search` and `/api/mosques/nearby` |
| Push | `/api/push/public-key` and `/api/push/subscribe` |
| Feedback/admin | `/api/feedback`, `/api/admin/users`, `/api/admin/feedback/[id]`, and `/api/admin/notifications/broadcast` |
| Scheduled work | `GET /api/cron/quran-reminders` sends due Quran reminder notifications |

Validate request bodies and parameters at route boundaries. Authentication,
admin authorization, database mutations, and private credentials must remain
server-side.

## External data providers

| Provider | Used for |
| --- | --- |
| Quran.com API v4 | Surah metadata, Uthmani text, translations, recitations, and Urdu tafsir |
| Quran Foundation media host | Verse audio files and the Uthmani Hafs web font |
| Internet Archive | Urdu Quran audio indexes and files |
| fawazahmed0/quran-api on jsDelivr | Arabic/Urdu source text and fonts used to generate PDFs |
| HadithAPI | Hadith collections, chapters, entries, and search |
| AlAdhan | Prayer times, Hijri calendar data, and Qibla direction |
| UmmahAPI | Dua categories, azkar content, and the 99 Names |
| OpenStreetMap Overpass | Nearby mosque lookup |
| Google Identity | Optional Google sign-in |

Remote requests use caching/revalidation where the content permits it. User
state and privileged operations must never be cached as public content.

## Persistence and authentication

MongoDB database name: `al-huda`.

Main collections:

- `users`: identity, password credentials, login/activity totals, settings,
  favourite Surahs, bookmarked ayahs, last-read position, notifications, and
  push subscriptions
- `feedback`: submitted feedback, rating/category, moderation state, and user
  association

Email/password credentials use salted password hashes. Login state is a signed,
HTTP-only, same-site cookie with a seven-day lifetime. `AUTH_SECRET` must be
unique and private in production. Google sign-in verifies ID tokens against
Google certificates and the configured client ID.

Admin routes use the authenticated server-side allowlisted admin identity.
Surah PDF files under `public/surah-pdfs` are also guarded by session validation
in `src/proxy.ts`.

## Generated and tracked content

Do not delete these files as generic build output:

- `src/data/surah-index.json`: canonical metadata for all 114 Surahs
- `src/data/tafsir-availability.json`: identifies tafsir pages that can be
  exposed in sitemaps
- `public/surah-pdfs/*.pdf` and `manifest.json`: authenticated download assets

Refresh them with:

```bash
npm run seo:generate
npm run seo:generate-tafsir
npm run generate:surah-pdfs
```

The PDF command downloads source Quran data and fonts and can take time.
`npm run build:seo` runs all three generators before the production build.

Normal disposable output—`.next`, `coverage`, `*.tsbuildinfo`, local environment
files, and package-manager caches—is excluded by `.gitignore`.

## SEO, PWA, and offline behavior

- `src/lib/seo.ts` and related SEO modules build metadata and schema objects.
- `src/app/robots.ts` controls crawler rules.
- `/sitemap.xml` is the sitemap index; Quran sitemap chunks are served below
  `/sitemaps/[name]`, with separate local, Hadith, and Islamic-tools sitemaps.
- `src/app/manifest.ts` provides the web app manifest.
- `public/sw.js` and `public/offline.html` provide service-worker caching and an
  offline fallback.
- `next.config.mjs` defines canonical redirects, security/cache headers, image
  settings, and production URL validation.

Do not claim fixed Lighthouse scores, ranking gains, or performance results in
documentation unless a current reproducible report is stored separately as a
deliberate test artifact.

## Development and verification

Typical safe verification:

```bash
npm run lint
npm test
npm run build
```

Focused project checks:

```bash
npm run security:check
npm run seo:check
```

The test suite lives beside domain modules as `*.test.ts`. A production build
also validates server/client boundaries, route generation, TypeScript, and
required production URL configuration.

## Deployment

### Vercel

Set production environment values in the Vercel project. In particular,
`NEXT_PUBLIC_SITE_URL` must be the canonical public HTTPS origin.

`/api/cron/quran-reminders` is intentionally scheduled by an external service
instead of Vercel Cron, because Vercel Hobby only permits a daily cron run.
cron-job.org calls it every 15 minutes with
`Authorization: Bearer <CRON_SECRET>`. The endpoint then uses each device's
stored time zone to decide whether its local 9:00 AM reminder is due; the cron
service itself must not be configured separately for every country.

### Docker

`Dockerfile` and `compose.yaml` intentionally use Bun, so `bun.lockb` is
required for that workflow even though local commands and `packageManager` use
npm/`package-lock.json`.

```bash
docker compose up
```

Review the production image and standalone-output strategy before treating the
development Compose file as a final deployment configuration.

## Documentation and AI maintenance rules

Keep documentation small and durable:

- Update `README.md` when setup, commands, prerequisites, or headline features
  change.
- Update this `PROJECT.md` when architecture, routes, integrations, persistence,
  generated content, or deployment behavior changes.
- Do not create one-off “complete”, “summary”, “status”, “action plan”, or
  “quick reference” Markdown reports for ordinary AI-generated changes.
- Put temporary notes in an issue/task system or the current conversation, not
  in tracked `note.txt`-style files.
- Never place credentials, tokens, private keys, user data, or real environment
  values in documentation, examples, source code, or commits.
- Before changing behavior, inspect the relevant code and tests. After changing
  behavior, run checks proportional to the risk and update these documents only
  when their source-of-truth information changed.
