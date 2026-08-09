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
- Vercel deployment support and a Bun-based Docker image

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
| `SEARCH_CONSOLE_SITE_URL` | Optional URL-prefix Search Console property; defaults to `http://readalquran.online/` |
| `ALHUDA_DASHBOARD_API_TOKEN` | Shared server-side token that allows the dashboard proxy to call admin APIs without an Al-Huda browser login |
| `ANALYTICS_DASHBOARD_ORIGINS` | Optional comma-separated dashboard origins allowed for legacy browser-to-Al-Huda admin API access |
| `ANALYTICS_DASHBOARD_URL` | Dashboard URL used to redirect legacy `/admin` paths; the admin UI lives in the dashboard |
| `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` | Public VAPID key for browser push subscriptions |
| `WEB_PUSH_PRIVATE_KEY` | Private VAPID key; server only |
| `WEB_PUSH_SUBJECT` | VAPID contact, normally a `mailto:` address |
| `PUSH_TRACKING_SECRET` | Optional dedicated HMAC secret for notification-click attribution; falls back to `CRON_SECRET` |
| `CRON_SECRET` | Bearer secret for scheduled cron endpoints |

Vercel supplies `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA` automatically.
`NEXT_PUBLIC_APP_VERSION` and `DEPLOYMENT_ENV` are optional deployment
overrides.

## Scheduled push reminders

The production reminder endpoint is
`GET /api/cron/quran-reminders`. Trigger it externally every 5 minutes (or
faster) so the server can evaluate each subscription in its own time zone and
send only the notification that is due. Enabled guest and signed-in devices are
eligible from local 9:00 AM onward; if an exact 9:00 AM run is missed, the next
authorized run later that local day catches it up. The same endpoint also
delivers enabled prayer reminders to the device and the signed-in user's bell.
Each prayer offset has its own delivery key, so changing a reminder from 30 to
20 minutes can still produce the later 20-minute reminder without duplicates.

On the Vercel Hobby plan, do not add this schedule to `vercel.json`: the plan
only permits one Vercel cron run per day. Configure a cron-job.org task with:

- URL: `https://www.readalquran.online/api/cron/quran-reminders`
- Method: `GET`
- Schedule: every 5 minutes, continuously
- Header: `Authorization: Bearer <the production CRON_SECRET value>`

Store `CRON_SECRET` only in Vercel and cron-job.org. Never put it in the URL,
source code, or a Git commit. A successful job returns JSON with `ok: true`.

## Search Console dashboard data

`GET /api/admin/analytics?view=search` returns live Search Console data for the
dashboard; it does not store report snapshots in MongoDB. It includes aggregate,
daily, query, page, country, and device reports. The default range is the 30 days
ending three days ago, because Search Console data is delayed.

The Search Console API must be enabled in the same Google Cloud project, and the
existing Analytics service-account email must be added to the Search Console
property as a user. Use the exact URL-prefix property, including its protocol
and trailing slash; for this project it is `http://readalquran.online/`.

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
