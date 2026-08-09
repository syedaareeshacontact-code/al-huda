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
  ChevronRight,
  Clock3,
  Headphones,
  Loader2,
  MapPin,
  MoonStar,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
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

type NotificationPanelView = 'inbox' | 'preferences';

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
  const [activeView, setActiveView] = useState<NotificationPanelView>('inbox');
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelContentRef = useRef<HTMLElement | null>(null);
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
    setActiveView('inbox');
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      setLocationPickerOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 639px)').matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (locationPickerOpen) {
        return;
      }

      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !panelContentRef.current?.contains(target)
      ) {
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close notifications' : 'Open notifications'}
        aria-expanded={open}
        aria-controls="notification-center-panel"
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

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[160]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notification center"
                className="absolute inset-0 h-full w-full border-0 bg-black/55 backdrop-blur-[2px] sm:bg-black/35"
              />

              <section
                ref={panelContentRef}
                id="notification-center-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="notification-center-title"
                className="absolute inset-x-0 bottom-0 z-10 flex h-[min(92dvh,44rem)] flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[var(--color-surface)] shadow-[0_-24px_70px_rgba(0,0,0,0.42)] animate-fade-up sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[calc(var(--site-header-visible-offset,4.25rem)_+_0.65rem)] sm:h-auto sm:max-h-[min(42rem,calc(100dvh-7rem))] sm:w-[25rem] sm:rounded-2xl sm:border sm:shadow-[0_24px_70px_rgba(0,0,0,0.38)]"
              >
                <header className="relative shrink-0 overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%),var(--color-surface))] px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] sm:pt-4">
                  <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
                  <div className="relative flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_80%)] text-[var(--color-accent-soft)] shadow-[var(--shadow-soft)]">
                      <BellRing className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent-soft)]">
                          Notification center
                        </p>
                        <Badge
                          variant={unreadCount > 0 ? 'default' : 'outline'}
                          className="px-2 py-0 text-[9px] tracking-[0.1em]"
                        >
                          {unreadCount} unread
                        </Badge>
                      </div>
                      <h2
                        id="notification-center-title"
                        className="mt-1 font-display text-xl font-semibold leading-tight text-[var(--color-heading)]"
                      >
                        Stay connected to your journey
                      </h2>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-muted-text)]">
                        Prayer, Quran, Hadith, saved activity and account updates in one place.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Close notifications"
                      title="Close"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface),transparent_12%)] text-[var(--color-muted-text)] shadow-sm transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </header>

                <div
                  className="grid shrink-0 grid-cols-2 gap-1 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-2"
                  role="tablist"
                  aria-label="Notification center views"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeView === 'inbox'}
                    onClick={() => setActiveView('inbox')}
                    className={cn(
                      'inline-flex h-9 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                      activeView === 'inbox'
                        ? 'border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] text-[var(--color-accent-soft)] shadow-sm'
                        : 'border border-transparent text-[var(--color-muted-text)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-heading)]'
                    )}
                  >
                    <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                    Inbox
                    {unreadCount > 0 ? (
                      <span className="min-w-4 rounded-full bg-[var(--color-danger)] px-1 text-[9px] font-bold leading-4 text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeView === 'preferences'}
                    onClick={() => setActiveView('preferences')}
                    className={cn(
                      'inline-flex h-9 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                      activeView === 'preferences'
                        ? 'border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_88%)] text-[var(--color-accent-soft)] shadow-sm'
                        : 'border border-transparent text-[var(--color-muted-text)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-heading)]'
                    )}
                  >
                    <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Preferences
                  </button>
                </div>

                {activeView === 'inbox' ? (
                  <>
                    <div
                      role="tabpanel"
                      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
                    >
                      <section className="rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_52%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-accent),var(--color-surface)_94%),var(--color-surface-elevated))] p-3 shadow-[var(--shadow-soft)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-heading)]">
                              <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                              What you&apos;ll receive
                            </p>
                            <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-muted-text)]">
                              Helpful, non-promotional updates.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveView('preferences')}
                            className="shrink-0 text-[10px] font-bold text-[var(--color-accent-soft)] transition hover:text-[var(--color-accent)]"
                          >
                            Manage
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveView('preferences')}
                            className="group min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-left transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)]"
                          >
                            <Clock3 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                            <span className="mt-1.5 block text-[10px] font-bold text-[var(--color-heading)]">
                              Prayer
                            </span>
                            <span className="mt-0.5 block truncate text-[9px] text-[var(--color-muted-text)]">
                              {settings.prayerEnabled
                                ? settings.reminderMinutes > 0
                                  ? `${settings.reminderMinutes}m before`
                                  : 'At prayer time'
                                : 'Turned off'}
                            </span>
                          </button>
                          <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                            <BookOpen className="h-4 w-4 text-sky-400" aria-hidden="true" />
                            <span className="mt-1.5 block text-[10px] font-bold text-[var(--color-heading)]">
                              Learning
                            </span>
                            <span className="mt-0.5 block truncate text-[9px] text-[var(--color-muted-text)]">
                              Quran + Hadith
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveView('preferences')}
                            className="group min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-left transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)]"
                          >
                            <Smartphone className="h-4 w-4 text-violet-400" aria-hidden="true" />
                            <span className="mt-1.5 block text-[10px] font-bold text-[var(--color-heading)]">
                              Device alerts
                            </span>
                            <span className="mt-0.5 block truncate text-[9px] text-[var(--color-muted-text)]">
                              {pushEnabled ? 'Enabled' : 'Optional'}
                            </span>
                          </button>
                        </div>
                      </section>

                      <div className="mb-2 mt-3 flex items-end justify-between gap-3 px-1">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-heading)]">
                            Recent activity
                          </h3>
                          <p className="mt-0.5 text-[10px] text-[var(--color-muted-text)]">
                            Tap an item to open it and mark it as read.
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold text-[var(--color-muted-text)]">
                          {notifications.length} total
                        </span>
                      </div>

                      {loading ? (
                        <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-10 text-sm text-[var(--color-muted-text)]">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading notifications
                        </div>
                      ) : notifications.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => setActiveView('preferences')}
                          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-left transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)]"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-accent-soft)]">
                            <Bell className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[var(--color-heading)]">
                              You&apos;re all caught up
                            </span>
                            <span className="mt-0.5 block text-[10px] leading-relaxed text-[var(--color-muted-text)]">
                              New reminders and account updates will appear here.
                            </span>
                          </span>
                          <Settings2 className="h-4 w-4 shrink-0 text-[var(--color-muted-text)]" />
                        </button>
                      ) : (
                        <div className="space-y-2">
                          {notifications.map((notification) => {
                            const config = typeConfig[notification.type];
                            const Icon = config.icon;
                            const content = (
                              <div
                                className={cn(
                                  'group flex w-full gap-3 rounded-2xl border p-3 text-left transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)]',
                                  notification.readAt
                                    ? 'border-[var(--color-border)] bg-[var(--color-surface-elevated)]'
                                    : 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_52%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_94%)] shadow-[var(--shadow-soft)]'
                                )}
                              >
                                <span
                                  className={cn(
                                    'mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                                    config.className
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-start gap-2">
                                    <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[var(--color-heading)]">
                                      {notification.title}
                                    </span>
                                    <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[10px] font-semibold text-[var(--color-muted-text)]">
                                      {!notification.readAt ? (
                                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" aria-label="Unread" />
                                      ) : null}
                                      {formatRelativeTime(notification.createdAt)}
                                    </span>
                                  </span>
                                  <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-muted-text)]">
                                    {notification.message}
                                  </span>
                                  <span className="mt-2 flex items-center gap-2">
                                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
                                      {config.label}
                                    </span>
                                    {notification.priority === 'high' ? (
                                      <span className="rounded-full bg-[var(--color-danger)]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-danger)]">
                                        Important
                                      </span>
                                    ) : null}
                                    {notification.href ? (
                                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-[var(--color-muted-text)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)]" />
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

                    <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={loading}
                          onClick={() => void loadNotifications()}
                        >
                          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                          Refresh
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={unreadCount === 0}
                          onClick={() => void markAllRead()}
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Mark all as read
                        </Button>
                      </div>
                    </footer>
                  </>
                ) : (
                  <div
                    role="tabpanel"
                    className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
                  >
                    <div className="px-1">
                      <h3 className="text-sm font-semibold text-[var(--color-heading)]">
                        Choose how reminders reach you
                      </h3>
                      <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-muted-text)]">
                        Inbox updates work while you&apos;re signed in. Device alerts can also reach you when the site is closed.
                      </p>
                    </div>

                    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-[var(--shadow-soft)]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-400">
                          <Clock3 className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--color-heading)]">
                            Daily prayer reminders
                          </p>
                          <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--color-muted-text)]">
                            Receive an alert before Fajr, Dhuhr, Asr, Maghrib and Isha.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={settings.prayerEnabled}
                          aria-label="Daily prayer reminders"
                          onClick={() =>
                            updateSettings({
                              ...settings,
                              prayerEnabled: !settings.prayerEnabled,
                            })
                          }
                          className={cn(
                            'relative mt-1 h-6 w-11 shrink-0 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                            settings.prayerEnabled
                              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                              : 'border-[var(--color-border)] bg-[var(--color-surface-3)]'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform',
                              settings.prayerEnabled ? 'translate-x-5' : 'translate-x-0.5'
                            )}
                          />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-[var(--color-border)] pt-3">
                        <button
                          type="button"
                          onClick={openPrayerLocationPicker}
                          className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left transition hover:border-[var(--color-accent-soft)] hover:bg-[var(--color-surface-2)]"
                        >
                          <MapPin className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted-text)]">
                              Prayer location
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--color-heading)]">
                              {prayerLocationLabel}
                            </span>
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-text)]" />
                        </button>

                        <label className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2">
                          <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted-text)]">
                            Alert before
                          </span>
                          <select
                            value={settings.reminderMinutes}
                            onChange={(event) =>
                              updateSettings({
                                ...settings,
                                reminderMinutes: Number(event.target.value),
                              })
                            }
                            className="mt-0.5 h-5 bg-transparent text-xs font-semibold text-[var(--color-heading)] outline-none"
                          >
                            {[0, 5, 10, 15, 20, 30].map((minute) => (
                              <option key={minute} value={minute}>
                                {minute === 0 ? 'At time' : `${minute} min`}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-[var(--shadow-soft)]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-400">
                          <Smartphone className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--color-heading)]">
                              Device alerts
                            </p>
                            <span
                              className={cn(
                                'rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]',
                                pushEnabled
                                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-400'
                                  : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted-text)]'
                              )}
                            >
                              {pushEnabled ? 'On' : 'Off'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--color-muted-text)]">
                            Allow important reminders to appear on this device, even when Read al Quran is closed.
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--color-border)] pt-3">
                        {['Prayer', 'Quran', 'Hadith', 'Saved ayahs', 'Account'].map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[9px] font-semibold text-[var(--color-muted-text)]"
                          >
                            {label}
                          </span>
                        ))}
                      </div>

                      {pushEnabled || isPushSuccessMessage ? (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                          <CheckCheck className="h-4 w-4 shrink-0" />
                          Enabled on this device
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={pushBusy || !pushSupported || !webPushConfigured}
                          onClick={() => void enableWebsitePush()}
                          className="mt-3 w-full"
                        >
                          {pushBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BellRing className="h-3.5 w-3.5" />
                          )}
                          Enable device alerts
                        </Button>
                      )}

                      {!pushSupported ? (
                        <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-danger)]">
                          This browser does not support web push notifications.
                        </p>
                      ) : !webPushConfigured ? (
                        <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-muted-text)]">
                          Device alerts are not configured on the server yet. Inbox updates will still work.
                        </p>
                      ) : pushMessage === PUSH_PERMISSION_DENIED_MESSAGE ? (
                        <PushPermissionResetHelp />
                      ) : pushMessage && !isPushSuccessMessage ? (
                        <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-muted-text)]">
                          {pushMessage}
                        </p>
                      ) : null}
                    </section>

                    <div className="flex gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                      <p className="text-[10px] leading-relaxed text-[var(--color-muted-text)]">
                        You stay in control. Device permission can be changed anytime from your browser settings.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>,
            document.body
          )
        : null}

      {open && locationPickerOpen && typeof document !== 'undefined'
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
    </div>
  );
}
