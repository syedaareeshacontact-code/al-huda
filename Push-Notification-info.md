# Push Notification System

This document describes the push-notification and signed-in notification-bell
implementation currently used by Read Al Quran. It covers browser enrollment,
guest and user ownership, scheduled engagement, prayer reminders, onboarding,
admin broadcasts, delivery tracking, persistence, security, and operations.

## 1. System overview

The implementation has two related delivery channels:

1. **Web Push** displays an operating-system/browser notification, including
   when the website tab is closed. It requires browser permission, an active
   `PushSubscription`, HTTPS, the production service worker, and configured
   VAPID keys.
2. **Notification bell** stores notifications inside the signed-in user's
   MongoDB record and displays them in the website header. Guests do not have a
   notification bell because they do not have a user account.

Some notification sources use both channels, while others use Web Push only.

| Notification source | Guest push | Signed-in push | Signed-in bell |
| --- | ---: | ---: | ---: |
| Daily 9:00 AM engagement | Yes | Yes | No |
| New-account onboarding | No | Yes, one time | Yes |
| Prayer reminder | No | Yes | Yes |
| Admin signed-in reader broadcast | No | Optional | Yes |
| Admin guest-device broadcast | Yes | No | No |
| User notification API | No | Yes | Yes |

## 2. Main architecture

```text
Browser
  -> production service worker registration
  -> browser notification permission
  -> PushManager subscription
  -> guest or user subscription API
  -> MongoDB subscription storage

External scheduler
  -> GET /api/cron/quran-reminders
  -> engagement and prayer due checks
  -> web-push/VAPID provider request
  -> public/sw.js displays the notification
  -> display/open receipts return to the API

Signed-in notification source
  -> notification stored in users.notifications
  -> NotificationCenter loads it into the header bell
  -> optional Web Push delivery to enabled user devices
```

The shared send pipeline is
`src/lib/push/send-push-notification.ts`. Scheduled reminders, onboarding,
user-created notifications, and dashboard broadcasts all use it.

## 3. Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` | Yes | Public VAPID key returned to browsers. |
| `WEB_PUSH_PRIVATE_KEY` | Yes | Private VAPID key used only by the server. |
| `WEB_PUSH_SUBJECT` | Recommended | VAPID contact, normally `mailto:...`; falls back to `mailto:admin@readalquran.local`. |
| `CRON_SECRET` | Production cron | Bearer secret for `/api/cron/quran-reminders`. |
| `PUSH_TRACKING_SECRET` | Recommended | HMAC secret for signed display/open tracking tokens. |
| `MONGODB_URI` | Yes | Stores subscriptions, bell records, settings, claims, and audits. |
| `ALHUDA_DASHBOARD_API_TOKEN` | Dashboard use | Shared server-side token used by the dashboard proxy. |
| `ANALYTICS_DASHBOARD_ORIGINS` | Optional | Extra allowed origins for legacy direct dashboard access. |
| `NEXT_PUBLIC_APP_VERSION` | Optional | Service-worker build version used for safe upgrades and cache names. |

`PUSH_TRACKING_SECRET` falls back to `CRON_SECRET`, then
`WEB_PUSH_PRIVATE_KEY`. A dedicated value is preferred so key responsibilities
remain separate.

Never commit private VAPID keys, cron secrets, tracking secrets, dashboard
tokens, or real push subscription keys.

## 4. Service worker and browser requirements

`src/components/providers/service-worker-register.tsx` registers
`/sw.js?v=<build-version>` in production. It uses `updateViaCache: "none"` and
checks for a newer worker after registration.

Important behavior:

- The service worker is intentionally unregistered and Read Al Quran caches are
  cleared in local development. Real closed-tab push behavior must therefore be
  tested on a production build over HTTPS.
- Unsupported browsers continue to use the site normally, but cannot receive
  Web Push.
- Permission must be `granted`. If it is `default`, the guest enrollment UI may
  show an opt-in prompt. If it is `denied`, the user must re-enable permission
  from the browser/site settings.
- The service worker uses `/logos/pwa-192.png` as the default notification icon
  and `/logos/notification-badge-96.png` as the small monochrome Android badge.
- The notification click opens or focuses the notification URL.
- Next.js runtime assets and RSC responses are not cached by this worker, which
  avoids mixing files from different deployments.

## 5. Browser enrollment and ownership

### 5.1 Guest enrollment

`GuestPushEnrollment` runs after session detection. In production, it:

1. Loads the VAPID public key from `GET /api/push/public-key`.
2. Waits for the service worker.
3. Reuses an existing browser `PushSubscription`, or creates one after
   permission is granted.
4. Generates/reuses the local site device UUID.
5. Sends the subscription, device ID, timezone, user agent, and content
   preference to `POST /api/push/guest-subscribe`.

Guest records are stored in the `guest_push_subscriptions` collection. The push
endpoint is unique. The guest API also checks same-origin mutations.

The opt-in prompt is shown after about four seconds when permission is still
undecided. Dismissing it snoozes the prompt for seven days.

### 5.2 Signed-in enrollment

Authenticated subscriptions are stored inside the user's `pushSubscriptions`
array in the `users` collection. A user can retain up to eight of the most
recent subscriptions.

`POST /api/push/subscribe` requires a signed-in session. It saves or refreshes
the endpoint, encryption keys, timezone, user agent, content preference,
`quranReminderEnabled`, and related delivery counters.

### 5.3 Guest-to-user migration after sign-in

When a guest signs in, `GuestPushEnrollment` runs again with an authenticated
session and posts the existing endpoint to `/api/push/guest-subscribe`. The
server then:

1. Upserts that endpoint into the signed-in user's subscriptions.
2. Disables the guest ownership record while preserving its historical
   delivery information.
3. Marks the browser owner as `user` in local storage.
4. Attempts the one-time onboarding pushes.

The same endpoint is removed from other user records before it is assigned to
the current user. This prevents one browser endpoint from being owned by
multiple accounts.

### 5.4 Removing permission or a subscription

The signed-in and guest subscription APIs support `DELETE`. They can remove a
known endpoint or match the current browser by parsed user-agent details. A
provider response of HTTP `404` or `410` also disables the expired endpoint
automatically.

## 6. New signed-in user onboarding

Every new account receives two bell records during account creation:

1. `Welcome, <name>`
2. `Prayer reminders are ready`

When the first enabled user push subscription becomes available, these two
records are sent as Web Push notifications as well. The user-level
`onboardingPushSentAt` claim makes this a one-time operation, so refreshing the
page or re-saving the same subscription does not resend them.

Onboarding push is only possible after browser permission and an enabled user
subscription exist. Creating an account cannot itself push to a device that has
not granted permission or supplied an endpoint.

The one-time claim is per account, not per device. A second device added later
does not receive the original onboarding pushes again.

## 7. Daily 9:00 AM engagement notifications

The external cron endpoint evaluates each subscription in its own IANA
timezone. Delivery becomes eligible at local 9:00 AM and remains eligible for
catch-up later that local day. The last engagement timestamp prevents a second
daily engagement notification.

### Guest cadence

Enabled guests are eligible every day. Their default content preference is
Hadith-first, although visiting Quran or Hadith paths can update the preference.

### Signed-in cadence

Signed-in subscriptions must have `quranReminderEnabled: true`. Their cadence
depends on recent activity:

| Reader state | Definition | Cadence |
| --- | --- | --- |
| Active | Seen within 14 days | Daily |
| Cooling | Seen 15–60 days ago | Monday, Wednesday, Friday |
| Dormant | Seen more than 60 days ago, or no valid last-seen value | Friday |

A newly signed-in user is active, so after the onboarding pushes the next
authorized scheduler run after local 9:00 AM can send that day's engagement
notification. If a notification is expected within 2–3 minutes, the external
scheduler must run every 2–3 minutes. The supported operational baseline is
every five minutes or faster.

### Engagement content

The scheduler selects Quran, Hadith, or general Islamic content using the
audience, day of week, and content preference:

- Quran notifications can continue from the signed-in user's last-read ayah.
- Friday's generic Quran selection prefers Surah Al-Kahf.
- Hadith content uses the curated Hadith index and has a safe fallback if the
  provider request fails.
- Islamic reminders rotate between Azkar, duas, and the Names of Allah.

Daily campaigns are bucketed so subscriptions receiving the same campaign are
delivered together.

## 8. Prayer reminders

Prayer reminders are available only to signed-in users because they require
persisted per-user settings and a notification bell.

### Settings

The settings are stored in `users.prayerReminderSettings`:

```json
{
  "enabled": false,
  "city": "Karachi",
  "country": "Pakistan",
  "reminderMinutes": 10
}
```

They are read and updated through `GET /api/auth/prayer-reminders` and
`PUT /api/auth/prayer-reminders`. The UI currently offers these offsets:

- 30 minutes before
- 20 minutes before
- 15 minutes before
- 10 minutes before
- 5 minutes before
- 0 minutes, at prayer time

The API accepts any whole number from 0 through 60.

### Scheduling and prayer-time provider

The cron endpoint loads daily timings from AlAdhan
`timingsByCity` using `method=1` and `school=1`. It validates the returned date,
uses the provider timezone when available, and checks these prayers:

- Fajr
- Dhuhr
- Asr
- Maghrib
- Isha

A due reminder creates a high-priority `prayer` notification in the user's bell
and sends Web Push to every enabled subscription belonging to that user.

The due window is 16 minutes from the calculated reminder minute. Running the
cron every five minutes keeps the check inside this window while allowing for
short scheduler delays.

### Offset changes and repeat delivery

The reminder delivery key contains:

```text
local-date : country : city : prayer : reminder-minutes
```

Therefore each offset is independent. For example, if the 30-minute reminder
has already arrived and the user changes the setting to 20 minutes before the
20-minute reminder becomes due, the 20-minute push and bell record can still be
created. The same applies to 15, 10, 5, and 0 minutes.

Only one offset is stored at a time. The system does not automatically send all
six offsets from one selection. To receive several reminders for the same
prayer, the user must change the selected offset before each later offset is
due. Changing to an offset after its 16-minute delivery window has passed does
not create a retroactive reminder.

Up to 360 recent prayer reminder keys are retained per user to prevent
duplicates while bounding record size.

## 9. Signed-in notification bell

`NotificationCenter` is rendered only for authenticated users. It uses:

- `GET /api/auth/notifications` to load bell records.
- `POST /api/auth/notifications` to create a bell record and send it to all
  enabled user push subscriptions.
- `PATCH /api/auth/notifications` to mark one or all records as read.

The bell refreshes when opened and also polls every 60 seconds, allowing a
server-created prayer or admin record to appear without a full page reload.

Notification types are `prayer`, `quran`, `bookmark`, `audio`, `system`, and
`islamic`. Priorities are `low`, `normal`, and `high`. Each user retains at most
80 bell records.

Bell storage and Web Push delivery are separate outcomes. A prayer or admin
record may appear in the bell even if the device has blocked push permission or
the push provider rejects that device endpoint.

## 10. External cron operation

Endpoint:

```text
GET /api/cron/quran-reminders
Authorization: Bearer <CRON_SECRET>
```

Recommended schedule: every five minutes, continuously. For the requested
2–3-minute post-login catch-up behavior, configure a two- or three-minute
interval.

Production rejects missing or incorrect authorization with `401`. If no
`CRON_SECRET` is configured, unauthenticated execution is allowed only outside
production.

The endpoint performs both jobs in one run:

1. Daily Quran/Hadith/Islamic engagement for guest and signed-in subscriptions.
2. Due prayer reminders for signed-in users.

The JSON response reports checked targets, due guest/user engagement targets,
content counts, campaign counts, engagement delivery totals, and a nested
`prayer` summary containing `checked`, `due`, `bellCreated`, `sent`, `failed`,
`disabled`, `retried`, `persistenceFailed`, and `unavailable`.

If Web Push is not configured and at least one delivery is due, the endpoint
returns `503`. It also returns `503` when every due delivery fails.

## 11. Admin dashboard notifications

The separate dashboard calls its own same-origin proxy. The proxy verifies the
dashboard session, attaches `X-ReadAlQuran-Dashboard-Token`, and forwards the
request to the Al-Huda `/api/admin/...` endpoint. The same
`ALHUDA_DASHBOARD_API_TOKEN` must be configured in both deployments.

### Signed-in reader broadcast

`POST /api/admin/notifications/broadcast` can target all users or up to 500
selected user IDs. It always creates bell records for the selected users. The
`push` boolean controls whether enabled signed-in devices also receive Web Push.

### Guest-device broadcast

`POST /api/admin/notifications/guest-broadcast` can target all enabled guest
subscriptions or up to 500 selected device IDs. Guests receive Web Push only;
there is no guest bell record.

### Dashboard reporting endpoints

- `GET /api/admin/notifications/devices` returns reconciled guest/user devices,
  aggregate delivery metrics, visits, and recent delivery audits.
- `GET /api/admin/notifications/guest-devices` returns guest devices and recent
  audits.
- `GET /api/admin/notifications/activity` reports recent reader logins and
  guest/user notification opt-ins for the dashboard bell.

The Al-Huda admin APIs accept either the trusted dashboard service token or an
authorized Al-Huda admin session/origin flow. A dashboard-side permission error
can be caused by the proxy/session/token configuration before a broadcast ever
reaches the Al-Huda API.

## 12. Push payload and display behavior

The server serializes a payload similar to:

```json
{
  "title": "Dhuhr reminder",
  "body": "Dhuhr prayer starts in 20 minutes in Karachi, Pakistan.",
  "icon": "/logos/pwa-192.png",
  "badge": "/logos/notification-badge-96.png",
  "tag": "prayer-<reminder-key>",
  "renotify": true,
  "url": "/prayer-times",
  "data": {
    "kind": "prayer",
    "trackingToken": "<signed-token>"
  }
}
```

The service worker applies safe defaults if fields are absent. The Web Push
request also includes a provider topic derived from the campaign ID, a TTL, and
an urgency value.

Current source-specific TTL values include:

| Source | TTL |
| --- | ---: |
| Daily engagement | 12 hours |
| Prayer reminder | 30 minutes |
| Account onboarding | 1 hour |
| General/admin default | 24 hours unless overridden |

Provider acceptance means the provider accepted the request; it does not prove
that the operating system displayed it. Display and open receipts provide the
stronger downstream signals.

## 13. Delivery retries, failures, and endpoint disabling

Each endpoint delivery receives up to three transport attempts. The normal
retry delays are 250 ms and 1 second. HTTP `429` honors a bounded
`Retry-After` value when available. Status `0`, `408`, `425`, `429`, and `5xx`
are treated as retryable.

HTTP `404` and `410` indicate an expired push subscription and automatically
disable it. Other failures increment the device failure count but keep the
endpoint available for a later attempt.

Delivery runs use bounded concurrency:

- Up to 24 push endpoints concurrently in the shared sender.
- Up to 4 engagement campaign buckets concurrently.
- Up to 24 guest engagement claims concurrently.
- Up to 8 prayer targets concurrently.

Guest scheduled deliveries use an atomic daily claim. Failed ambiguous
deliveries keep a bounded lease to reduce duplicate pushes if the provider may
have accepted a timed-out request.

## 14. Delivery tracking and analytics

Every push attempt gets a random delivery ID, campaign ID, notification kind,
owner type, owner ID, device/endpoint reference, and source. Sources include:

- `scheduled`
- `admin-guest-broadcast`
- `admin-user-broadcast`
- `user-notification`
- `general`

Delivery status progresses through:

```text
pending -> accepted -> displayed -> opened
             or
pending -> failed
```

The provider-accepted event is stored after `web-push` succeeds. `public/sw.js`
posts a display receipt after `showNotification` and an open receipt after the
notification is clicked.

Tracking tokens are HMAC-signed, expire after seven days, and include hashed
endpoint identity for signed-in users. Tokens are placed in the URL fragment on
notification click so they are not sent in ordinary server/CDN request logs.

If a display/open receipt cannot be posted immediately, the service worker
retries it and can queue it in IndexedDB with Background Sync. Queued receipts
expire after seven days.

Detailed records are stored in `push_delivery_audits` and automatically expire
after 90 days. Aggregate counters are also maintained on guest/user
subscriptions. Delivery-ID dedupe lists retain the most recent 512 IDs.

Dashboard metrics include:

- Provider-accepted notifications
- Tracked accepted notifications
- Displayed notifications
- Notification opens/visits
- Tracked opens
- Total site visits
- Display rate
- Notification open rate
- Displayed-to-open rate

## 15. MongoDB persistence

### `users`

Push-related user fields include:

- `notifications`: up to 80 bell records.
- `pushSubscriptions`: up to 8 recent browser endpoints.
- `prayerReminderSettings`: enabled, city, country, and current offset.
- `prayerReminderClaims`: up to 360 recent dedupe keys.
- `onboardingPushSentAt`: one-time onboarding push claim.

Each stored user subscription includes the endpoint and encryption keys,
device/browser details, timezone, content preference, enabled flags,
last-seen/sent/engagement timestamps, failure count, tracking counters, and
bounded accepted/displayed/opened delivery ID lists.

### `guest_push_subscriptions`

Each guest record includes a stable application device ID, unique endpoint,
encryption keys, timezone, user agent, preference, enabled/disabled status,
failure state, engagement claim state, counters, and tracking dedupe lists.

### `push_delivery_audits`

Contains one detailed lifecycle record per delivery ID, including source,
campaign, state timestamps, safe endpoint hash, provider status/error, and
whether the endpoint was disabled. Records have a 90-day TTL.

### `site_devices`

Stores total visit information used alongside push metrics in the admin device
view.

## 16. API reference

| Method and route | Authentication | Purpose |
| --- | --- | --- |
| `GET /api/push/public-key` | Public | Reports push availability and returns the public VAPID key. |
| `POST /api/push/guest-subscribe` | Same-origin | Creates/refreshes a guest endpoint or migrates it to the signed-in user. |
| `DELETE /api/push/guest-subscribe` | Same-origin | Removes guest/current-browser push ownership. |
| `POST /api/push/subscribe` | Signed-in user | Creates/refreshes a user endpoint and triggers onboarding delivery if unclaimed. |
| `DELETE /api/push/subscribe` | Signed-in user | Removes a user endpoint/current-browser subscription. |
| `POST /api/push/visit` | Same-origin/session-aware | Records guest or signed-in site visits associated with push devices. |
| `POST /api/push/displayed` | Signed tracking token | Records service-worker display. |
| `POST /api/push/open` | Signed tracking token | Records notification click/open. |
| `GET /api/auth/notifications` | Signed-in user | Loads bell notifications. |
| `POST /api/auth/notifications` | Signed-in user | Creates a bell notification and pushes it to enabled user devices. |
| `PATCH /api/auth/notifications` | Signed-in user | Marks one/all bell notifications read. |
| `GET /api/auth/prayer-reminders` | Signed-in user | Loads persisted prayer settings. |
| `PUT /api/auth/prayer-reminders` | Signed-in user | Replaces persisted prayer settings. |
| `GET /api/cron/quran-reminders` | Bearer `CRON_SECRET` | Runs daily engagement and prayer reminder delivery. |
| `POST /api/admin/notifications/broadcast` | Admin/dashboard service | Sends signed-in user bell notifications and optional push. |
| `POST /api/admin/notifications/guest-broadcast` | Admin/dashboard service | Sends guest-device push. |
| `GET /api/admin/notifications/devices` | Admin/dashboard service | Returns combined device and delivery reporting. |
| `GET /api/admin/notifications/guest-devices` | Admin/dashboard service | Returns guest-device reporting. |
| `GET /api/admin/notifications/activity` | Admin/dashboard service | Returns login and opt-in activity for the dashboard bell. |

## 17. Troubleshooting

### No push on mobile

Check in this order:

1. The site is deployed over HTTPS and running a production build.
2. Browser notification permission is `granted`.
3. `GET /api/push/public-key` returns `enabled: true` and a public key.
4. The production service worker is registered and controls the page.
5. The browser endpoint exists as an enabled guest or user device in the
   dashboard notification-device page.
6. The external cron is calling the correct production URL with the exact
   bearer secret.
7. The cron response shows the subscription was checked and due.
8. Recent delivery audit shows `accepted`, `displayed`, `opened`, or a provider
   error.
9. Battery saver, browser background restrictions, and OS-level notification
   settings are not suppressing delivery.

### Guest receives 9:00 AM notification but signed-in user does not

Confirm that guest ownership migrated to the user after sign-in, the user
endpoint has `quranReminderEnabled: true`, its timezone is valid, it is due for
the signed-in activity cadence, and `lastEngagementAt` is not already on the
same local date. Signed-in delivery supports post-9:00 AM catch-up.

### Onboarding bell records exist but mobile pushes do not

The two bell records are created with the account, but mobile delivery waits for
an enabled user push subscription. Verify permission, endpoint migration, VAPID
configuration, and `onboardingPushSentAt`.

### Prayer reminder does not arrive

Confirm that:

- Prayer reminders are enabled for the user.
- City, country, and offset are saved through the prayer-settings API.
- At least one enabled user push subscription exists.
- AlAdhan returned timings for the configured location/date.
- The scheduler ran inside the 16-minute reminder window.
- The reminder key is not already in `prayerReminderClaims`.
- The notification appears in the bell even if Web Push failed.

### Android shows no app badge/logo on the left

The small Android badge comes from
`public/logos/notification-badge-96.png`. It must remain a valid transparent
monochrome notification badge. The larger app artwork uses
`public/logos/pwa-192.png`. Browser/Android versions may render badge colors
differently, but a missing or unsuitable badge asset can result in a blank or
generic icon.

### Dashboard says permission is missing

Verify the dashboard login session, the dashboard server proxy, and that the
same `ALHUDA_DASHBOARD_API_TOKEN` is configured in both projects. Browser code
does not send this secret directly; the dashboard server adds it to the
upstream request.

### Provider says accepted but the phone showed nothing

Provider acceptance is not display confirmation. Inspect the delivery audit for
a `displayed` receipt. If none exists, check the service worker version,
OS/browser permission, battery/background restrictions, and whether the
endpoint belongs to the current browser installation.

## 18. Testing and validation

Run the full project checks:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Relevant automated coverage includes:

- Engagement schedule and content selection
- Prayer reminder timing and offset-specific keys
- Quran timezone schedule helper
- Push sending, retry, failure, and tracking behavior
- Guest subscription persistence
- Delivery-audit persistence
- Display/open receipt APIs
- Service-worker receipt handling
- Admin device ownership reconciliation

For an end-to-end device test, use a production HTTPS deployment and verify this
sequence:

1. Grant notification permission as a guest.
2. Confirm a guest device appears in the dashboard.
3. Sign in and confirm ownership changes to the user.
4. Confirm the two one-time onboarding pushes and bell records.
5. Trigger the authorized cron after local 9:00 AM and inspect its response.
6. Enable a prayer reminder and trigger cron inside the due window.
7. Confirm both mobile display and bell record.
8. Click the notification and confirm the audit progresses to `opened`.

## 19. Key source files

| File | Responsibility |
| --- | --- |
| `public/sw.js` | Push display, click navigation, receipt retry/queue, PWA caching. |
| `src/components/providers/service-worker-register.tsx` | Production service-worker lifecycle. |
| `src/components/notifications/guest-push-enrollment.tsx` | Guest opt-in and guest-to-user endpoint migration. |
| `src/components/notifications/notification-center.tsx` | Signed-in bell, user push opt-in, prayer UI/settings. |
| `src/app/api/cron/quran-reminders/route.ts` | Engagement and prayer scheduler execution. |
| `src/lib/push/engagement-schedule.ts` | 9:00 AM eligibility and activity cadence. |
| `src/lib/push/engagement-content.ts` | Quran, Hadith, and Islamic campaign content. |
| `src/lib/push/prayer-reminder-schedule.ts` | Prayer offset due checks and unique keys. |
| `src/lib/push/user-onboarding.ts` | One-time onboarding push delivery. |
| `src/lib/push/send-push-notification.ts` | Shared VAPID send, retry, tracking, and failure handling. |
| `src/lib/push/guest-push-store.ts` | Guest subscription persistence and claims. |
| `src/lib/auth/users-store.ts` | User subscriptions, bell records, prayer settings, and counters. |
| `src/lib/push/push-open-tracking.ts` | Signed tracking token creation/verification. |
| `src/lib/push/push-delivery-audit-store.ts` | Detailed delivery lifecycle audit. |
| `src/app/api/admin/notifications/*` | Dashboard broadcast, device, and activity APIs. |

## 20. Operational checklist

Before a production release that changes notifications:

- Confirm public/private VAPID keys are a matching pair.
- Confirm `CRON_SECRET` and the scheduler Authorization header match.
- Confirm the scheduler interval is five minutes or faster.
- Confirm `PUSH_TRACKING_SECRET` remains stable across deployments.
- Confirm the dashboard token matches in both projects.
- Confirm `notification-badge-96.png` remains transparent and suitable for
  Android's monochrome status notification rendering.
- Run tests, TypeScript, ESLint, and a production build.
- Test one guest device and one signed-in device over HTTPS.
- Inspect accepted, displayed, and opened audit states rather than relying only
  on the provider-accepted count.
