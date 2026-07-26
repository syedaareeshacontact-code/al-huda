# Read Al Quran

Read Al Quran is a full-stack Islamic web application for reading, listening to,
studying, and downloading Quran content. It also includes Hadith, duas, azkar,
prayer times, Qibla direction, a mosque finder, the 99 Names of Allah, and a
Zakat calculator.

## Main features

- All 114 Surahs with Arabic text, Urdu translation, Urdu tafsir, search, audio,
  bookmarks, favourites, last-read state, and reading preferences
- Arabic recitation and Urdu audio with a global player
- Arabic-only and Arabic-with-Urdu PDF downloads for every Surah
- Hadith collections, books, individual Hadith pages, and search
- Duas, azkar, prayer times, Qibla direction, nearby mosques, and Islamic tools
- Email/password and Google sign-in with MongoDB-backed user data
- Notifications, web-push Quran reminders, feedback, and protected admin pages
- Responsive light/dark UI, installable PWA support, offline fallback, SEO
  metadata, structured data, robots rules, and segmented sitemaps

## Technology

- Next.js 16 App Router and React 19
- TypeScript 5 and Tailwind CSS 4
- MongoDB with Mongoose
- Vitest and ESLint
- PDFKit for generated Surah downloads
- Vercel deployment/cron support and a Bun-based Docker image

## Local setup

Requirements:

- Node.js 20.9 or newer
- npm 10 or newer
- MongoDB locally or a remote MongoDB connection string

```bash
git clone <repository-url>
cd al-huda
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If `MONGODB_URI` is not
set, development uses `mongodb://127.0.0.1:27017/al-huda`.

Create a local `.env` from the variables table below, or pull environment
variables from Vercel. Never commit `.env` or `.env.local`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection for users, state, feedback, notifications, and admin data |
| `NEXT_PUBLIC_SITE_URL` | Canonical public origin used by metadata, robots, sitemaps, and the manifest; production requires public HTTPS |
| `AUTH_SECRET` | HMAC secret for signed login sessions; use a long random production value |
| `GOOGLE_CLIENT_ID` | Server-side Google ID-token audience |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Browser-side Google Identity client ID |
| `HADITH_API_KEY` | Server-side Hadith provider credential |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional Google Search Console verification value |
| `NEXT_PUBLIC_GA_ID` | Optional Google Analytics measurement ID |
| `GA4_PROPERTY_ID` | Google Analytics 4 property ID used by admin analytics APIs |
| `ANALYTICS_DASHBOARD_ORIGINS` | Comma-separated dashboard origins allowed to use the admin APIs and dashboard sign-in endpoint |
| `ANALYTICS_DASHBOARD_URL` | Dashboard URL used to redirect legacy `/admin` paths; the admin UI lives in the dashboard |
| `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` | Public VAPID key for browser push subscriptions |
| `WEB_PUSH_PRIVATE_KEY` | Private VAPID key; server only |
| `WEB_PUSH_SUBJECT` | VAPID contact, normally a `mailto:` address |
| `CRON_SECRET` | Bearer secret for scheduled cron endpoints |

Vercel supplies `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA` automatically.
`NEXT_PUBLIC_APP_VERSION` and `DEPLOYMENT_ENV` are optional deployment
overrides.

## Commands

| Command | Use |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |
| `npm run build` | Create a production build |
| `npm start` | Serve an existing production build |
| `npm run security:check` | Check tracked files for common secret leakage |
| `npm run seo:check` | Run the secret check and SEO regression tests |
| `npm run seo:generate` | Refresh `src/data/surah-index.json` |
| `npm run seo:generate-tafsir` | Refresh tafsir availability data |
| `npm run generate:surah-pdfs` | Generate all protected Surah PDF assets |
| `npm run build:seo` | Refresh SEO/PDF data and then build |

To run the Bun-based development container:

```bash
docker compose up
```

## Documentation

- `README.md` (this file): product overview, setup, environment, and daily
  commands.
- [`PROJECT.md`](PROJECT.md): the authoritative architecture, routes, data
  sources, persistence, deployment, generated assets, and maintenance context
  for developers and AI tools.

Keep these two documents current instead of creating separate one-off status,
SEO, performance, or implementation-summary Markdown files.
