'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BellRing,
  BookMarked,
  BookOpen,
  CheckCheck,
  Clock3,
  Headphones,
  Loader2,
  MoonStar,
  Settings2,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { NotificationType, UserNotification } from '@/types/notifications';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  isAuthenticated: boolean;
}

interface NotificationResponse {
  notifications?: UserNotification[];
  unreadCount?: number;
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
  };
}

interface WebPushPublicKeyResponse {
  enabled?: boolean;
  publicKey?: string;
}

interface NotificationSettings {
  soundEnabled: boolean;
  desktopEnabled: boolean;
  prayerEnabled: boolean;
  prayerCity: string;
  prayerCountry: string;
  reminderMinutes: number;
}

const SETTINGS_KEY = 'alhuda-notification-settings';
const PRAYER_SENT_KEY = 'alhuda-prayer-notifications-sent';
const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: false,
  desktopEnabled: false,
  prayerEnabled: true,
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
      soundEnabled: Boolean(parsed.soundEnabled),
      desktopEnabled: Boolean(parsed.desktopEnabled),
      prayerEnabled: parsed.prayerEnabled !== false,
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

export default function NotificationCenter({ isAuthenticated }: NotificationCenterProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>('default');
  const [webPushPublicKey, setWebPushPublicKey] = useState('');
  const [webPushConfigured, setWebPushConfigured] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const panelRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const didLoadInitialRef = useRef(false);
  const lastUnreadCountRef = useRef(0);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications]
  );

  const pushSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const playNotificationSound = useCallback(() => {
    if (!settings.soundEnabled || typeof window === 'undefined') {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;
    void context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.34);
  }, [settings.soundEnabled]);

  const sendDesktopNotification = useCallback(
    (notification: UserNotification) => {
      if (
        !settings.desktopEnabled ||
        typeof window === 'undefined' ||
        !('Notification' in window) ||
        Notification.permission !== 'granted'
      ) {
        return;
      }

      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/logos/logo1.png',
        tag: notification.id,
      });

      if (notification.href) {
        desktopNotification.onclick = () => {
          window.focus();
          window.location.href = notification.href ?? '/';
        };
      }
    },
    [settings.desktopEnabled]
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
      const nextUnreadCount =
        payload.unreadCount ?? nextNotifications.filter((notification) => !notification.readAt).length;

      if (didLoadInitialRef.current && nextUnreadCount > lastUnreadCountRef.current) {
        playNotificationSound();
      }

      didLoadInitialRef.current = true;
      lastUnreadCountRef.current = nextUnreadCount;
      setNotifications(nextNotifications);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, playNotificationSound]);

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

      const payload = (await response.json()) as { notification?: UserNotification };
      if (payload.notification) {
        setNotifications((prev) => [payload.notification!, ...prev].slice(0, 80));
        lastUnreadCountRef.current += 1;
        playNotificationSound();
        sendDesktopNotification(payload.notification);
      }

      return payload.notification ?? null;
    },
    [isAuthenticated, playNotificationSound, sendDesktopNotification]
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
      setPushEnabled(Boolean(subscription));
    } catch {
      setWebPushConfigured(false);
      setPushEnabled(false);
    }
  }, [pushSupported]);

  const enableQuranPush = async () => {
    if (!pushSupported || !webPushConfigured || !webPushPublicKey) {
      setPushMessage('Push reminders need HTTPS, service worker, and VAPID keys.');
      return;
    }

    try {
      setPushBusy(true);
      setPushMessage('');

      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();
      setDesktopPermission(permission);

      if (permission !== 'granted') {
        setPushMessage('Notification permission was not allowed.');
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
          quranReminderEnabled: true,
          intervalMinutes: 2,
        }),
      });

      if (!response.ok) {
        setPushMessage('Unable to save this device for push reminders.');
        return;
      }

      setPushEnabled(true);
      updateSettings({ ...settings, desktopEnabled: true });
      setPushMessage('Quran push reminders are enabled for this device.');
    } catch {
      setPushMessage('Push reminders could not be enabled on this browser.');
    } finally {
      setPushBusy(false);
    }
  };

  const disableQuranPush = async () => {
    if (!pushSupported) {
      return;
    }

    try {
      setPushBusy(true);
      setPushMessage('');
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setPushEnabled(false);
      setPushMessage('Quran push reminders are off for this device.');
    } catch {
      setPushMessage('Unable to disable push reminders right now.');
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    setSettings(readSettings());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setDesktopPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    void refreshPushStatus();
  }, [refreshPushStatus]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!isAuthenticated || !settings.prayerEnabled) {
      return;
    }

    let ignore = false;
    let todayDate = '';
    let timings: Record<string, string> | null = null;

    const loadPrayerTimings = async () => {
      const today = new Date().toISOString().slice(0, 10);
      if (timings && todayDate === today) {
        return timings;
      }

      const response = await fetch(
        `https://api.aladhan.com/v1/timingsByCity/${today}?city=${encodeURIComponent(
          settings.prayerCity
        )}&country=${encodeURIComponent(settings.prayerCountry)}&method=1&school=1`
      );
      const payload = (await response.json()) as PrayerTimingsPayload;
      timings = payload.data?.timings ?? null;
      todayDate = today;
      return timings;
    };

    const checkPrayerReminders = async () => {
      try {
        const prayerTimings = await loadPrayerTimings();
        if (ignore || !prayerTimings) {
          return;
        }

        const now = new Date();
        const dateKey = now.toISOString().slice(0, 10);
        const sentKeys = readSentPrayerKeys();

        for (const prayer of PRAYER_NAMES) {
          const parsed = normalizePrayerTime(prayerTimings[prayer] ?? '');
          if (!parsed) {
            continue;
          }

          const reminderAt = new Date(now);
          reminderAt.setHours(parsed.hour, parsed.minute - settings.reminderMinutes, 0, 0);
          const diffMs = now.getTime() - reminderAt.getTime();
          const key = `${dateKey}:${settings.prayerCity}:${prayer}:${settings.reminderMinutes}`;

          if (diffMs >= 0 && diffMs < 45_000 && !sentKeys.has(key)) {
            sentKeys.add(key);
            writeSentPrayerKeys(sentKeys);
            await createNotification({
              type: 'prayer',
              priority: 'high',
              title: `${prayer} reminder`,
              message:
                settings.reminderMinutes > 0
                  ? `${prayer} prayer starts in ${settings.reminderMinutes} minutes in ${settings.prayerCity}.`
                  : `${prayer} prayer time has started in ${settings.prayerCity}.`,
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
  };

  const enableSound = async () => {
    updateSettings({ ...settings, soundEnabled: !settings.soundEnabled });
    if (!settings.soundEnabled) {
      playNotificationSound();
    }
  };

  const requestDesktopPermission = async () => {
    if (!('Notification' in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    setDesktopPermission(permission);
    updateSettings({ ...settings, desktopEnabled: permission === 'granted' });
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
    lastUnreadCountRef.current = 0;
    await fetch('/api/auth/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-all-read' }),
    });
  };

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
        <div className="fixed left-1/2 top-4 z-[160] max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_58%)] bg-[var(--color-surface)] shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.65rem)] sm:translate-x-0">
          <div className="border-b border-[var(--color-border)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent),transparent_86%),transparent)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-soft)]">
                  Notifications
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-[var(--color-heading)]">
                  Prayer & Quran alerts
                </h2>
              </div>
              <Badge variant={unreadCount > 0 ? 'default' : 'outline'} className="shrink-0">
                {unreadCount} unread
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={enableSound}>
                {settings.soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                {settings.soundEnabled ? 'Sound on' : 'Sound off'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={requestDesktopPermission}>
                <Settings2 className="h-3.5 w-3.5" />
                {desktopPermission === 'granted' ? 'Desktop on' : 'Desktop'}
              </Button>
            </div>
          </div>

          <div className="border-b border-[var(--color-border)] p-3">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className="min-w-0">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted-text)]">
                  Prayer city
                </span>
                <input
                  value={settings.prayerCity}
                  onChange={(event) => updateSettings({ ...settings, prayerCity: event.target.value })}
                  className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent-soft)]"
                />
              </label>
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
            <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-heading)]">
                    Quran push reminders
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--color-muted-text)]">
                    Sends Surah reminders from server cron or your external scheduler.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={pushEnabled ? 'default' : 'outline'}
                  disabled={pushBusy || !pushSupported || !webPushConfigured}
                  onClick={() => {
                    if (pushEnabled) {
                      void disableQuranPush();
                    } else {
                      void enableQuranPush();
                    }
                  }}
                  className="shrink-0"
                >
                  {pushBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {pushEnabled ? 'Push on' : 'Enable'}
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
              ) : pushMessage ? (
                <p className="mt-2 text-[10px] text-[var(--color-muted-text)]">{pushMessage}</p>
              ) : null}
            </div>
          </div>

          <div className="max-h-[min(23rem,calc(100dvh-18rem))] overflow-y-auto p-2">
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

          <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] p-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => void loadNotifications()}>
              Refresh
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void markAllRead()}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
