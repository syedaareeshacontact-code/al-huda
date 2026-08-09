'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BellRing,
  BookMarked,
  BookOpen,
  Check,
  CheckCheck,
  Clock3,
  Headphones,
  Loader2,
  MapPin,
  MoonStar,
  Search,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { NotificationType, UserNotification } from '@/types/notifications';
import {
  getCitiesForCountry,
  getCountryOption,
  PRAYER_LOCATION_OPTIONS,
  sameLocationValue,
  searchTextMatches,
} from '@/lib/prayer-location-options';
import { getPushContentPreferenceFromPath } from '@/lib/push/engagement-types';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  isAuthenticated: boolean;
}

interface NotificationResponse {
  notifications?: UserNotification[];
}

interface NotificationCreateResponse {
  notification?: UserNotification;
  pushTargets?: number;
  push?: {
    sent?: number;
    failed?: number;
    disabled?: number;
    unavailable?: boolean;
  };
}

interface PrayerReminderSettingsResponse {
  settings?: {
    enabled?: boolean;
    city?: string;
    country?: string;
    reminderMinutes?: number;
  };
}

interface PrayerTimingsPayload {
  code?: number;
  data?: {
    timings?: Record<string, string>;
    date?: {
      gregorian?: {
        date?: string;
      };
    };
    meta?: {
      timezone?: string;
    };
  };
}

interface WebPushPublicKeyResponse {
  enabled?: boolean;
  publicKey?: string;
}

interface NotificationSettings {
  prayerEnabled: boolean;
  prayerCity: string;
  prayerCountry: string;
  reminderMinutes: number;
}

const SETTINGS_KEY = 'alhuda-notification-settings';
const PRAYER_SENT_KEY = 'alhuda-prayer-notifications-sent';
const PUSH_ENDPOINT_KEY = 'alhuda:push-subscription-endpoint';
const PUSH_PERMISSION_DENIED_MESSAGE = 'Notification permission was not allowed.';
const PUSH_ENABLE_SUCCESS_MESSAGE = 'Notifications are on. Thanks.';
const PUSH_SUCCESS_VISIBLE_MS = 5_000;
const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

const DEFAULT_SETTINGS: NotificationSettings = {
  prayerEnabled: false,
  prayerCity: 'Karachi',
  prayerCountry: 'Pakistan',
  reminderMinutes: 10,
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

const typeConfig: Record<
  NotificationType,
  {
    label: string;
    icon: typeof Bell;
    className: string;
  }
> = {
  prayer: {
    label: 'Prayer',
    icon: Clock3,
    className: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30',
  },
  quran: {
    label: 'Quran',
    icon: BookOpen,
    className: 'text-sky-300 bg-sky-500/10 border-sky-400/30',
  },
  bookmark: {
    label: 'Saved',
    icon: BookMarked,
    className: 'text-amber-300 bg-amber-500/10 border-amber-400/30',
  },
  audio: {
    label: 'Audio',
    icon: Headphones,
    className: 'text-violet-300 bg-violet-500/10 border-violet-400/30',
  },
  system: {
    label: 'Account',
    icon: ShieldCheck,
    className: 'text-[var(--color-accent-soft)] bg-[color-mix(in_oklab,var(--color-accent),transparent_86%)] border-[color-mix(in_oklab,var(--color-accent),transparent_60%)]',
  },
  islamic: {
    label: 'Reminder',
    icon: MoonStar,
    className: 'text-cyan-300 bg-cyan-500/10 border-cyan-400/30',
  },
};

function readSettings(): NotificationSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<NotificationSettings>;
    return {
      prayerEnabled: parsed.prayerEnabled === true,
      prayerCity: String(parsed.prayerCity ?? DEFAULT_SETTINGS.prayerCity).trim() || DEFAULT_SETTINGS.prayerCity,
      prayerCountry:
        String(parsed.prayerCountry ?? DEFAULT_SETTINGS.prayerCountry).trim() ||
        DEFAULT_SETTINGS.prayerCountry,
      reminderMinutes: Math.max(
        0,
        Math.min(60, Math.floor(Number(parsed.reminderMinutes ?? DEFAULT_SETTINGS.reminderMinutes)))
      ),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: NotificationSettings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function formatRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();
  if (!Number.isFinite(createdAt)) {
    return '';
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (diffSeconds < 60) return 'Now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function normalizePrayerTime(raw: string) {
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function formatDateInTimeZone(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fall back to the browser timezone when a provider returns an unknown timezone.
  }

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function readTimeInTimeZone(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    const second = Number(parts.find((part) => part.type === 'second')?.value);

    if ([hour, minute, second].every(Number.isFinite)) {
      return { hour, minute, second };
    }
  } catch {
    // Fall back below.
  }

  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

function toAladhanDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  return `${day}-${month}-${year}`;
}

function readSentPrayerKeys() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PRAYER_SENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function writeSentPrayerKeys(keys: Set<string>) {
  window.localStorage.setItem(PRAYER_SENT_KEY, JSON.stringify(Array.from(keys).slice(-80)));
}

function InlineSiteControlsIcon() {
  return (
    <span className="mx-0.5 inline-flex h-5 w-5 translate-y-1 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-accent)]">
      <Settings2 className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}

function PushPermissionResetHelp() {
  return (
    <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[10px] leading-relaxed text-[var(--color-muted-text)]">
      <p>{PUSH_PERMISSION_DENIED_MESSAGE}</p>
      <div className="mt-2 rounded-lg bg-[color-mix(in_oklab,var(--color-accent),transparent_94%)] p-2">
        <p className="font-semibold text-[var(--color-heading)]">Or reset permission</p>
        <ol className="mt-1 hidden list-decimal space-y-1 pl-4 sm:block">
          <li>
            Click the site controls icon <InlineSiteControlsIcon /> beside the website address.
          </li>
          <li>
            Click <span className="font-semibold text-[var(--color-heading)]">Reset permission</span>.
          </li>
          <li>
            Click <span className="font-semibold text-[var(--color-heading)]">Enable</span> again,
            then choose <span className="font-semibold text-[var(--color-heading)]">Allow</span>.
          </li>
        </ol>
        <ol className="mt-1 list-decimal space-y-1 pl-4 sm:hidden">
          <li>
            Tap the site controls icon <InlineSiteControlsIcon /> beside the website address.
          </li>
          <li>
            Tap <span className="font-semibold text-[var(--color-heading)]">Permissions</span> or{' '}
            <span className="font-semibold text-[var(--color-heading)]">Notifications blocked</span>.
          </li>
          <li>
            Tap <span className="font-semibold text-[var(--color-heading)]">Reset permissions</span>.
          </li>
          <li>
            Tap <span className="font-semibold text-[var(--color-heading)]">Enable</span> again,
            then choose <span className="font-semibold text-[var(--color-heading)]">Allow</span>.
          </li>
        </ol>
      </div>
    </div>
  );
}

export default function NotificationCenter({ isAuthenticated }: NotificationCenterProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [draftCountry, setDraftCountry] = useState(DEFAULT_SETTINGS.prayerCountry);
  const [draftCity, setDraftCity] = useState(DEFAULT_SETTINGS.prayerCity);
  const [locationCountryQuery, setLocationCountryQuery] = useState('');
  const [locationCityQuery, setLocationCityQuery] = useState('');
  const [webPushPublicKey, setWebPushPublicKey] = useState('');
  const [webPushConfigured, setWebPushConfigured] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pushSuccessTimeoutRef = useRef<number | null>(null);
  const prayerSettingsSaveRef = useRef(Promise.resolve());

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications]
  );

  const countryOptions = useMemo(() => {
    const options = locationCountryQuery
      ? PRAYER_LOCATION_OPTIONS.filter((option) =>
          searchTextMatches([option.country, ...(option.aliases ?? [])].join(' '), locationCountryQuery)
        )
      : PRAYER_LOCATION_OPTIONS;

    return options.slice(0, 18);
  }, [locationCountryQuery]);

  const selectedCountryCities = useMemo(() => getCitiesForCountry(draftCountry), [draftCountry]);

  const cityOptions = useMemo(() => {
    const options = locationCityQuery
      ? selectedCountryCities.filter((city) => searchTextMatches(city, locationCityQuery))
      : selectedCountryCities;

    return options.slice(0, 18);
  }, [locationCityQuery, selectedCountryCities]);

  const typedCountry = locationCountryQuery.trim();
  const typedCity = locationCityQuery.trim();
  const pendingPrayerCity = draftCity.trim();
  const canSavePrayerLocation = Boolean(draftCountry.trim() && pendingPrayerCity);
  const showTypedCountryOption =
    Boolean(typedCountry) &&
    countryOptions.length === 0 &&
    !PRAYER_LOCATION_OPTIONS.some(
      (option) =>
        sameLocationValue(option.country, typedCountry) ||
        (option.aliases?.some((alias) => sameLocationValue(alias, typedCountry)) ?? false)
    );
  const showTypedCityOption =
    Boolean(typedCity) &&
    cityOptions.length === 0 &&
    !selectedCountryCities.some((city) => sameLocationValue(city, typedCity));
  const prayerLocationLabel = `${settings.prayerCity}, ${settings.prayerCountry}`;

  const pushSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const clearPushSuccessTimer = useCallback(() => {
    if (pushSuccessTimeoutRef.current !== null) {
      window.clearTimeout(pushSuccessTimeoutRef.current);
      pushSuccessTimeoutRef.current = null;
    }
  }, []);

  const showPushEnabledThanks = useCallback(() => {
    clearPushSuccessTimer();
    setPushMessage(PUSH_ENABLE_SUCCESS_MESSAGE);
    pushSuccessTimeoutRef.current = window.setTimeout(() => {
      setPushMessage((current) =>
        current === PUSH_ENABLE_SUCCESS_MESSAGE ? '' : current
      );
      pushSuccessTimeoutRef.current = null;
    }, PUSH_SUCCESS_VISIBLE_MS);
  }, [clearPushSuccessTimer]);

  const removeCurrentBrowserPushSubscription = useCallback(
    async (endpoint?: string) => {
      const storedEndpoint =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(PUSH_ENDPOINT_KEY) ?? undefined
          : undefined;
      const subscriptionEndpoint = endpoint ?? storedEndpoint;

      if (!isAuthenticated && !subscriptionEndpoint) {
        return;
      }

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentBrowser: true,
          ...(subscriptionEndpoint ? { endpoint: subscriptionEndpoint } : {}),
        }),
      }).catch(() => undefined);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(PUSH_ENDPOINT_KEY);
      }
    },
    [isAuthenticated]
  );

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/notifications', { cache: 'no-store' });
      if (!response.ok) {
        setNotifications([]);
        return;
      }

      const payload = (await response.json()) as NotificationResponse;
      const nextNotifications = payload.notifications ?? [];
      setNotifications(nextNotifications);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createNotification = useCallback(
    async (input: Omit<UserNotification, 'id' | 'createdAt' | 'readAt'>) => {
      if (!isAuthenticated) {
        return null;
      }

      const response = await fetch('/api/auth/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as NotificationCreateResponse;
      if (payload.notification) {
        setNotifications((prev) => [payload.notification!, ...prev].slice(0, 80));
      }

      return payload.notification ?? null;
    },
    [isAuthenticated]
  );

  const refreshPushStatus = useCallback(async () => {
    if (!pushSupported) {
      setWebPushConfigured(false);
      setPushEnabled(false);
      return;
    }

    try {
      const response = await fetch('/api/push/public-key', { cache: 'no-store' });
      const payload = (await response.json()) as WebPushPublicKeyResponse;
      const publicKey = payload.publicKey ?? '';
      setWebPushPublicKey(publicKey);
      setWebPushConfigured(Boolean(payload.enabled && publicKey));

      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (Notification.permission !== 'granted') {
        setPushEnabled(false);
        const storedEndpoint = window.localStorage.getItem(PUSH_ENDPOINT_KEY);
        if (subscription?.endpoint || storedEndpoint || Notification.permission === 'denied') {
          await removeCurrentBrowserPushSubscription(subscription?.endpoint);
        }
        if (Notification.permission === 'denied') {
          clearPushSuccessTimer();
          setPushMessage(PUSH_PERMISSION_DENIED_MESSAGE);
        }
        return;
      }

      setPushEnabled(Boolean(subscription));
      if (subscription) {
        window.localStorage.setItem(PUSH_ENDPOINT_KEY, subscription.endpoint);
      }
    } catch {
      setWebPushConfigured(false);
      setPushEnabled(false);
    }
  }, [clearPushSuccessTimer, pushSupported, removeCurrentBrowserPushSubscription]);

  const enableWebsitePush = async () => {
    if (!pushSupported || !webPushConfigured || !webPushPublicKey) {
      clearPushSuccessTimer();
      setPushMessage('Push reminders need HTTPS, service worker, and VAPID keys.');
      return;
    }

    try {
      setPushBusy(true);
      clearPushSuccessTimer();
      setPushMessage('');

      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();

      if (permission !== 'granted') {
        clearPushSuccessTimer();
        setPushMessage(PUSH_PERMISSION_DENIED_MESSAGE);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(webPushPublicKey),
        }));

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...subscription.toJSON(),
          timeZone: getBrowserTimeZone(),
          contentPreference: getPushContentPreferenceFromPath(pathname),
          quranReminderEnabled: true,
          intervalMinutes: 2,
        }),
      });

      if (!response.ok) {
        clearPushSuccessTimer();
        setPushMessage('Unable to save this device for push reminders.');
        return;
      }

      window.localStorage.setItem(PUSH_ENDPOINT_KEY, subscription.endpoint);
      setPushEnabled(true);
      showPushEnabledThanks();
    } catch {
      clearPushSuccessTimer();
      setPushMessage('Push reminders could not be enabled on this browser.');
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;
    void fetch('/api/auth/prayer-reminders', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as PrayerReminderSettingsResponse;
      })
      .then((payload) => {
        if (cancelled || !payload?.settings) {
          return;
        }

        const next: NotificationSettings = {
          prayerEnabled: payload.settings.enabled === true,
          prayerCity:
            String(payload.settings.city ?? DEFAULT_SETTINGS.prayerCity).trim() ||
            DEFAULT_SETTINGS.prayerCity,
          prayerCountry:
            String(payload.settings.country ?? DEFAULT_SETTINGS.prayerCountry).trim() ||
            DEFAULT_SETTINGS.prayerCountry,
          reminderMinutes: Math.max(
            0,
            Math.min(60, Math.floor(Number(payload.settings.reminderMinutes ?? 10)))
          ),
        };
        setSettings(next);
        writeSettings(next);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => () => clearPushSuccessTimer(), [clearPushSuccessTimer]);

  useEffect(() => {
    void refreshPushStatus();
  }, [refreshPushStatus]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const refresh = window.setInterval(() => void loadNotifications(), 60_000);
    return () => window.clearInterval(refresh);
  }, [isAuthenticated, loadNotifications]);

  useEffect(() => {
    if (open) {
      void loadNotifications();
    }
  }, [loadNotifications, open]);

  useEffect(() => {
    setOpen(false);
    setLocationPickerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      setLocationPickerOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (locationPickerOpen) {
        return;
      }

      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (locationPickerOpen) {
          setLocationPickerOpen(false);
          return;
        }

        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [locationPickerOpen, open]);

  useEffect(() => {
    if (
      process.env.NODE_ENV === 'production' ||
      !isAuthenticated ||
      !settings.prayerEnabled
    ) {
      return;
    }

    let ignore = false;
    let cachedTimings:
      | {
          dateKey: string;
          timeZone: string;
          timings: Record<string, string>;
        }
      | null = null;

    const fetchPrayerTimings = async (dateKey: string, fallbackTimeZone: string) => {
      const aladhanDate = toAladhanDate(dateKey);
      const response = await fetch(
        `https://api.aladhan.com/v1/timingsByCity/${aladhanDate}?city=${encodeURIComponent(
          settings.prayerCity
        )}&country=${encodeURIComponent(settings.prayerCountry)}&method=1&school=1`
      );
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as PrayerTimingsPayload;
      if (payload.data?.date?.gregorian?.date !== aladhanDate) {
        return null;
      }
      if (!payload.data?.timings) {
        return null;
      }

      return {
        dateKey,
        timeZone: payload.data.meta?.timezone || fallbackTimeZone,
        timings: payload.data.timings,
      };
    };

    const loadPrayerTimings = async () => {
      const now = new Date();
      if (cachedTimings?.dateKey === formatDateInTimeZone(now, cachedTimings.timeZone)) {
        return cachedTimings;
      }

      const fallbackTimeZone = cachedTimings?.timeZone || getBrowserTimeZone();
      const guessedDate = formatDateInTimeZone(now, fallbackTimeZone);
      let nextTimings = await fetchPrayerTimings(guessedDate, fallbackTimeZone);
      if (!nextTimings) {
        return null;
      }

      const targetDate = formatDateInTimeZone(now, nextTimings.timeZone);
      if (targetDate !== nextTimings.dateKey) {
        nextTimings = await fetchPrayerTimings(targetDate, nextTimings.timeZone);
        if (!nextTimings) {
          return null;
        }
      }

      cachedTimings = nextTimings;
      return cachedTimings;
    };

    const checkPrayerReminders = async () => {
      try {
        const prayerTimingResult = await loadPrayerTimings();
        if (ignore || !prayerTimingResult) {
          return;
        }

        const now = new Date();
        const currentTime = readTimeInTimeZone(now, prayerTimingResult.timeZone);
        const currentSeconds =
          currentTime.hour * 60 * 60 + currentTime.minute * 60 + currentTime.second;
        const dateKey = prayerTimingResult.dateKey;
        const sentKeys = readSentPrayerKeys();
        const locationLabel = `${settings.prayerCity}, ${settings.prayerCountry}`;

        for (const prayer of PRAYER_NAMES) {
          const parsed = normalizePrayerTime(prayerTimingResult.timings[prayer] ?? '');
          if (!parsed) {
            continue;
          }

          const reminderSeconds =
            (parsed.hour * 60 + parsed.minute - settings.reminderMinutes) * 60;
          const diffSeconds = currentSeconds - reminderSeconds;
          const key = `${dateKey}:${settings.prayerCountry}:${settings.prayerCity}:${prayer}:${settings.reminderMinutes}`;

          if (diffSeconds >= 0 && diffSeconds < 45 && !sentKeys.has(key)) {
            sentKeys.add(key);
            writeSentPrayerKeys(sentKeys);
            await createNotification({
              type: 'prayer',
              priority: 'high',
              title: `${prayer} reminder`,
              message:
                settings.reminderMinutes > 0
                  ? `${prayer} prayer starts in ${settings.reminderMinutes} minutes in ${locationLabel}.`
                  : `${prayer} prayer time has started in ${locationLabel}.`,
              href: '/prayer-times',
              metadata: {
                prayer,
                city: settings.prayerCity,
                country: settings.prayerCountry,
                reminderMinutes: settings.reminderMinutes,
              },
            });
          }
        }
      } catch {
        // Prayer reminders are best effort; the notification center keeps working offline.
      }
    };

    void checkPrayerReminders();
    const interval = window.setInterval(checkPrayerReminders, 30_000);
    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, [
    createNotification,
    isAuthenticated,
    settings.prayerCity,
    settings.prayerCountry,
    settings.prayerEnabled,
    settings.reminderMinutes,
  ]);

  const updateSettings = (next: NotificationSettings) => {
    setSettings(next);
    writeSettings(next);

    if (!isAuthenticated) {
      return;
    }

    prayerSettingsSaveRef.current = prayerSettingsSaveRef.current
      .catch(() => undefined)
      .then(async () => {
        await fetch('/api/auth/prayer-reminders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: next.prayerEnabled,
            city: next.prayerCity,
            country: next.prayerCountry,
            reminderMinutes: next.reminderMinutes,
          }),
        });
      });
  };

  const openPrayerLocationPicker = () => {
    setDraftCountry(settings.prayerCountry.trim() || DEFAULT_SETTINGS.prayerCountry);
    setDraftCity(settings.prayerCity.trim() || DEFAULT_SETTINGS.prayerCity);
    setLocationCountryQuery('');
    setLocationCityQuery('');
    setLocationPickerOpen(true);
  };

  const selectPrayerCountry = (country: string) => {
    const countryOption = getCountryOption(country);
    const nextCountry = countryOption?.country ?? country.trim();
    const cities = countryOption?.cities ?? [];
    setDraftCountry(nextCountry);
    setDraftCity(cities[0] ?? '');
    setLocationCountryQuery('');
    setLocationCityQuery('');
  };

  const selectPrayerCity = (city: string) => {
    setDraftCity(city.trim());
    setLocationCityQuery('');
  };

  const savePrayerLocation = () => {
    const nextCountry = draftCountry.trim();
    const nextCity = pendingPrayerCity.trim();
    if (!nextCountry || !nextCity) {
      return;
    }

    updateSettings({
      ...settings,
      prayerCountry: nextCountry,
      prayerCity: nextCity,
    });
    setLocationPickerOpen(false);
    setLocationCountryQuery('');
    setLocationCityQuery('');
  };

  const markRead = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId && !notification.readAt
          ? { ...notification, readAt: new Date().toISOString() }
          : notification
      )
    );
    await fetch('/api/auth/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-read', notificationId }),
    });
  };

  const markAllRead = async () => {
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, readAt: notification.readAt ?? nowIso }))
    );
    await fetch('/api/auth/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-all-read' }),
    });
  };

  const isPushSuccessMessage = pushMessage === PUSH_ENABLE_SUCCESS_MESSAGE;
  const shouldShowPushCard = !pushEnabled || Boolean(pushMessage);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open notifications"
        aria-expanded={open}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition',
          open
            ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_86%)] text-[var(--color-accent-soft)]'
            : 'border-[var(--color-border)] text-[var(--color-muted-text)] hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-heading)]'
        )}
      >
        {unreadCount > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full border border-[var(--color-bg)] bg-[var(--color-danger)] px-1 text-center text-[10px] font-bold leading-5 text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
        <div className="fixed left-1/2 top-4 z-[160] flex max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[var(--color-surface)] shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.65rem)] sm:max-h-[min(38rem,calc(100dvh-7rem))] sm:translate-x-0">
          <div className="shrink-0 border-b border-[var(--color-border)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent),transparent_86%),transparent)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
                  Notifications
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-[var(--color-heading)]">
                  Prayer, Quran & Hadith alerts
                </h2>
              </div>
              <Badge variant={unreadCount > 0 ? 'default' : 'outline'} className="shrink-0">
                {unreadCount} unread
              </Badge>
            </div>

          </div>

          <div className="shrink-0 border-b border-[var(--color-border)] p-3">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="min-w-0">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted-text)]">
                  Prayer location
                </span>
                <button
                  type="button"
                  onClick={openPrayerLocationPicker}
                  className="flex h-9 w-full items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-left text-xs text-[var(--color-text)] outline-none transition hover:border-[var(--color-accent-soft)] hover:bg-[color-mix(in_oklab,var(--color-accent),transparent_92%)] focus:border-[var(--color-accent-soft)]"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{prayerLocationLabel}</span>
                  <span className="shrink-0 text-[10px] font-semibold text-[var(--color-accent-soft)]">
                    Change
                  </span>
                </button>
              </div>
              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted-text)]">
                  Before
                </span>
                <select
                  value={settings.reminderMinutes}
                  onChange={(event) =>
                    updateSettings({ ...settings, reminderMinutes: Number(event.target.value) })
                  }
                  className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent-soft)]"
                >
                  {[0, 5, 10, 15, 20, 30].map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}m
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs">
              <span className="font-semibold text-[var(--color-heading)]">Daily prayer reminders</span>
              <input
                type="checkbox"
                checked={settings.prayerEnabled}
                onChange={(event) => updateSettings({ ...settings, prayerEnabled: event.target.checked })}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
            </label>
            {shouldShowPushCard ? (
              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
                {isPushSuccessMessage ? (
                  <p className="text-xs font-semibold text-[var(--color-heading)]">
                    {PUSH_ENABLE_SUCCESS_MESSAGE}
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-heading)]">
                          Website push notifications
                        </p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--color-muted-text)]">
                          Sends Quran, Hadith, account, saved ayah, Islamic, and admin alerts.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pushBusy || !pushSupported || !webPushConfigured}
                        onClick={() => {
                          void enableWebsitePush();
                        }}
                        className="shrink-0"
                      >
                        {pushBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Enable
                      </Button>
                    </div>
                    {!pushSupported ? (
                      <p className="mt-2 text-[10px] text-[var(--color-danger)]">
                        This browser does not support web push.
                      </p>
                    ) : !webPushConfigured ? (
                      <p className="mt-2 text-[10px] text-[var(--color-muted-text)]">
                        Add Web Push VAPID keys on the server to enable closed-app reminders.
                      </p>
                    ) : pushMessage === PUSH_PERMISSION_DENIED_MESSAGE ? (
                      <PushPermissionResetHelp />
                    ) : pushMessage ? (
                      <p className="mt-2 text-[10px] text-[var(--color-muted-text)]">
                        {pushMessage}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--color-muted-text)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading notifications
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-9 text-center">
                <Bell className="mx-auto h-8 w-8 text-[var(--color-muted-text)]" />
                <p className="mt-3 text-sm font-semibold text-[var(--color-heading)]">No notifications yet</p>
                <p className="mx-auto mt-1 max-w-56 text-xs leading-relaxed text-[var(--color-muted-text)]">
                  Prayer reminders and Quran updates will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => {
                  const config = typeConfig[notification.type];
                  const Icon = config.icon;
                  const content = (
                    <div
                      className={cn(
                        'group flex w-full gap-3 rounded-xl border p-3 text-left transition hover:bg-[var(--color-surface-2)]',
                        notification.readAt
                          ? 'border-transparent opacity-80'
                          : 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[color-mix(in_oklab,var(--color-accent),transparent_92%)]'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                          config.className
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--color-heading)]">
                            {notification.title}
                          </span>
                          <span className="shrink-0 text-[10px] font-semibold text-[var(--color-muted-text)]">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </span>
                        <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-muted-text)]">
                          {notification.message}
                        </span>
                        <span className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
                            {config.label}
                          </span>
                          {notification.priority === 'high' ? (
                            <span className="rounded-full bg-[var(--color-danger)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-danger)]">
                              Important
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </div>
                  );

                  return notification.href ? (
                    <Link
                      key={notification.id}
                      href={notification.href}
                      onClick={() => void markRead(notification.id)}
                      className="block no-underline"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void markRead(notification.id)}
                      className="block w-full"
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => void loadNotifications()}>
                Refresh
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void markAllRead()}>
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            </div>
          </div>
        </div>
        {locationPickerOpen && typeof document !== 'undefined'
          ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="prayer-location-title"
            className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setLocationPickerOpen(false);
              }
            }}
          >
            <div
              className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-[min(42rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:max-h-[min(38rem,calc(100dvh-3rem))]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent),transparent_88%),transparent)] p-3 sm:p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-accent)]">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3
                      id="prayer-location-title"
                      className="text-sm font-semibold text-[var(--color-heading)]"
                    >
                      Prayer location
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-text)]">
                      Select country, then choose or type city for local prayer reminders.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close prayer location"
                  onClick={() => setLocationPickerOpen(false)}
                  className="h-8 w-8 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto p-2 sm:grid-cols-2 sm:gap-3 sm:p-3">
                <section className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2">
                  <label
                    htmlFor="notification-prayer-country"
                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted-text)]"
                  >
                    Country
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-text)]"
                      aria-hidden="true"
                    />
                    <input
                      id="notification-prayer-country"
                      value={locationCountryQuery}
                      onChange={(event) => setLocationCountryQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && typedCountry) {
                          event.preventDefault();
                          const nextCountry = countryOptions[0]?.country ?? (showTypedCountryOption ? typedCountry : '');
                          if (nextCountry) {
                            selectPrayerCountry(nextCountry);
                          }
                        }
                      }}
                      placeholder="Search country"
                      className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent-soft)]"
                    />
                  </div>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1 sm:max-h-56">
                    {countryOptions.map((option) => {
                      const selected = sameLocationValue(option.country, draftCountry);

                      return (
                        <button
                          key={option.country}
                          type="button"
                          onClick={() => selectPrayerCountry(option.country)}
                          className={cn(
                            'flex h-9 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-xs transition',
                            selected
                              ? 'bg-[color-mix(in_oklab,var(--color-accent),transparent_84%)] text-[var(--color-heading)]'
                              : 'text-[var(--color-muted-text)] hover:bg-[var(--color-surface)] hover:text-[var(--color-heading)]'
                          )}
                        >
                          <span className="truncate">{option.country}</span>
                          {selected ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                          ) : null}
                        </button>
                      );
                    })}
                    {showTypedCountryOption ? (
                      <button
                        type="button"
                        onClick={() => selectPrayerCountry(typedCountry)}
                        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-2 text-left text-xs font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
                      >
                        <span className="truncate">Use &quot;{typedCountry}&quot;</span>
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                      </button>
                    ) : null}
                    {countryOptions.length === 0 && !showTypedCountryOption ? (
                      <p className="px-2 py-4 text-center text-xs text-[var(--color-muted-text)]">
                        No country found.
                      </p>
                    ) : null}
                  </div>
                </section>

                <section className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2">
                  <label
                    htmlFor="notification-prayer-city"
                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted-text)]"
                  >
                    City
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-text)]"
                      aria-hidden="true"
                    />
                    <input
                      id="notification-prayer-city"
                      value={locationCityQuery}
                      onChange={(event) => setLocationCityQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && typedCity) {
                          event.preventDefault();
                          const nextCity = cityOptions[0] ?? (showTypedCityOption ? typedCity : '');
                          if (nextCity) {
                            selectPrayerCity(nextCity);
                          }
                        }
                      }}
                      placeholder={selectedCountryCities.length > 0 ? 'Search city' : 'Type city name'}
                      className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent-soft)]"
                    />
                  </div>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1 sm:max-h-56">
                    {cityOptions.map((city) => {
                      const selected = sameLocationValue(city, pendingPrayerCity);

                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => selectPrayerCity(city)}
                          className={cn(
                            'flex h-9 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-xs transition',
                            selected
                              ? 'bg-[color-mix(in_oklab,var(--color-accent),transparent_84%)] text-[var(--color-heading)]'
                              : 'text-[var(--color-muted-text)] hover:bg-[var(--color-surface)] hover:text-[var(--color-heading)]'
                          )}
                        >
                          <span className="truncate">{city}</span>
                          {selected ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                          ) : null}
                        </button>
                      );
                    })}
                    {showTypedCityOption ? (
                      <button
                        type="button"
                        onClick={() => selectPrayerCity(typedCity)}
                        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-2 text-left text-xs font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
                      >
                        <span className="truncate">Use &quot;{typedCity}&quot;</span>
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                      </button>
                    ) : null}
                    {cityOptions.length === 0 && !showTypedCityOption ? (
                      <p className="px-2 py-4 text-center text-xs text-[var(--color-muted-text)]">
                        Type city name above.
                      </p>
                    ) : null}
                  </div>
                </section>
              </div>

              <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-w-0 text-xs text-[var(--color-muted-text)]">
                    Selected:{' '}
                    <span className="font-semibold text-[var(--color-heading)]">
                      {pendingPrayerCity || 'City'}, {draftCountry || 'Country'}
                    </span>
                  </p>
                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocationPickerOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canSavePrayerLocation}
                      onClick={savePrayerLocation}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
              document.body
            )
          : null}
        </>
      ) : null}
    </div>
  );
}
