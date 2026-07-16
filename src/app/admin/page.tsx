'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Gauge,
  Headphones,
  LayoutDashboard,
  Loader2,
  RefreshCcw,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminUsageSummary {
  totalUsers: number;
  totalSessionSeconds: number;
  totalAudioSeconds: number;
}

interface AdminUserRecord {
  totalSessionSeconds: number;
  totalAudioSeconds: number;
}

interface AdminUsersPayload {
  users?: AdminUserRecord[];
  summary?: AdminUsageSummary;
  message?: string;
}

interface BroadcastPayload {
  ok?: boolean;
  users?: number;
  inAppCreated?: number;
  pushTargets?: number;
  push?: {
    sent?: number;
    failed?: number;
    disabled?: number;
    unavailable?: boolean;
  };
  message?: string;
}

const EMPTY_SUMMARY: AdminUsageSummary = {
  totalUsers: 0,
  totalSessionSeconds: 0,
  totalAudioSeconds: 0,
};

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function normalizeSummary(payload: AdminUsersPayload): AdminUsageSummary {
  if (payload.summary) {
    return {
      totalUsers: Math.max(0, Number(payload.summary.totalUsers) || 0),
      totalSessionSeconds: Math.max(
        0,
        Number(payload.summary.totalSessionSeconds) || 0
      ),
      totalAudioSeconds: Math.max(
        0,
        Number(payload.summary.totalAudioSeconds) || 0
      ),
    };
  }

  const users = Array.isArray(payload.users) ? payload.users : [];
  return users.reduce<AdminUsageSummary>(
    (acc, user) => {
      acc.totalUsers += 1;
      acc.totalSessionSeconds += Math.max(0, Number(user.totalSessionSeconds) || 0);
      acc.totalAudioSeconds += Math.max(0, Number(user.totalAudioSeconds) || 0);
      return acc;
    },
    { ...EMPTY_SUMMARY }
  );
}

export default function AdminPage() {
  const [summary, setSummary] = useState<AdminUsageSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/users', {
        cache: 'no-store',
      });

      const payload = (await response.json()) as AdminUsersPayload;

      if (!response.ok) {
        setError(payload.message ?? 'Unable to load dashboard data.');
        return;
      }

      setSummary(normalizeSummary(payload));
      setLastUpdatedAt(new Date().toISOString());
    } catch {
      setError('Unable to load dashboard data right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const sendTestNotification = async () => {
    try {
      setSendingTest(true);
      setTestError(null);
      setTestResult(null);

      const response = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test notification',
          message: 'This is a test notification from Al Huda admin.',
          href: '/',
          type: 'system',
          priority: 'normal',
          push: true,
        }),
      });

      const payload = (await response.json().catch(() => null)) as BroadcastPayload | null;

      if (!response.ok) {
        setTestError(payload?.message ?? 'Unable to send test notification.');
        return;
      }

      const users = Math.max(0, Number(payload?.users) || 0);
      const inAppCreated = Math.max(0, Number(payload?.inAppCreated) || 0);
      const pushTargets = Math.max(0, Number(payload?.pushTargets) || 0);
      const pushSent = Math.max(0, Number(payload?.push?.sent) || 0);
      const pushFailed = Math.max(0, Number(payload?.push?.failed) || 0);

      setTestResult(
        `Sent to ${inAppCreated}/${users} logged-in users. Push sent ${pushSent}/${pushTargets}${
          pushFailed > 0 ? `, failed ${pushFailed}` : ''
        }.`
      );
    } catch {
      setTestError('Unable to send test notification right now.');
    } finally {
      setSendingTest(false);
    }
  };

  const graphStats = useMemo(() => {
    const maxTime = Math.max(summary.totalSessionSeconds, summary.totalAudioSeconds, 1);
    const sessionPercent = Math.round((summary.totalSessionSeconds / maxTime) * 100);
    const audioPercent = Math.round((summary.totalAudioSeconds / maxTime) * 100);
    const audioSharePercent =
      summary.totalSessionSeconds > 0
        ? Math.min(
            100,
            Math.max(0, Math.round((summary.totalAudioSeconds / summary.totalSessionSeconds) * 100))
          )
        : 0;

    return {
      sessionPercent,
      audioPercent,
      audioSharePercent,
    };
  }, [summary.totalAudioSeconds, summary.totalSessionSeconds]);

  return (
    <div className="pb-16 pt-10" data-slot="page-shell">
      <section className="mb-6 animate-fade-up">
        <Badge className="mb-2">Admin</Badge>
        <h1 className="font-display text-4xl text-[var(--color-heading)]">Tracking Dashboard</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-text)]">
          Website usage and audio watch time tracking for logged-in users only.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-[5rem] lg:h-fit">
          <Card className="border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_56%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface),white_16%),color-mix(in_oklab,var(--color-highlight),var(--color-surface)_95%))]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <LayoutDashboard className="size-5 text-[var(--color-accent)]" />
                Admin Sidebar
              </CardTitle>
              <CardDescription>Open admin sections from here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/admin"
                className="block rounded-lg border border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_52%)] bg-[color-mix(in_oklab,var(--color-surface-2),white_8%)] px-3 py-2 text-sm font-semibold text-[var(--color-heading)]"
              >
                Tracking Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="block rounded-lg border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_65%)] px-3 py-2 text-sm transition hover:bg-[color-mix(in_oklab,var(--color-surface-2),white_10%)]"
              >
                Users Table
              </Link>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <Card className="animate-fade-up">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-[var(--color-muted-text)]">
                Last Updated:{' '}
                <span className="font-semibold text-[var(--color-text)]">
                  {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : 'Not synced yet'}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadSummary()}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCcw className="size-4" />
                  Refresh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void sendTestNotification()}
                  disabled={sendingTest}
                  className="gap-2"
                >
                  {sendingTest ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <BellRing className="size-4" />
                  )}
                  {sendingTest ? 'Sending...' : 'Send test notification'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {error ? (
            <Card>
              <CardContent className="p-4 text-sm text-[var(--color-danger)]">{error}</CardContent>
            </Card>
          ) : null}

          {testResult || testError ? (
            <Card
              className={
                testError
                  ? 'border-[color-mix(in_oklab,var(--color-danger),var(--color-border)_54%)]'
                  : 'border-[color-mix(in_oklab,var(--color-success),var(--color-border)_56%)]'
              }
            >
              <CardContent
                className={
                  testError
                    ? 'flex items-start gap-2 p-4 text-sm text-[var(--color-danger)]'
                    : 'flex items-start gap-2 p-4 text-sm text-[var(--color-text)]'
                }
              >
                {testError ? (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-danger)]" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-success)]" />
                )}
                <span>{testError ?? testResult}</span>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="animate-fade-up">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                    Logged-in Users
                  </p>
                  <p className="mt-1 font-display text-3xl text-[var(--color-heading)]">
                    {loading ? '...' : summary.totalUsers}
                  </p>
                </div>
                <Users className="size-5 text-[var(--color-accent)]" />
              </CardContent>
            </Card>

            <Card className="animate-fade-up-delay-1">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                    Website Time
                  </p>
                  <p className="mt-1 font-display text-xl text-[var(--color-heading)]">
                    {loading ? '...' : formatDuration(summary.totalSessionSeconds)}
                  </p>
                </div>
                <Clock3 className="size-5 text-[var(--color-info)]" />
              </CardContent>
            </Card>

            <Card className="animate-fade-up-delay-2">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-text)]">
                    Audio Watch Time
                  </p>
                  <p className="mt-1 font-display text-xl text-[var(--color-heading)]">
                    {loading ? '...' : formatDuration(summary.totalAudioSeconds)}
                  </p>
                </div>
                <Headphones className="size-5 text-[var(--color-highlight)]" />
              </CardContent>
            </Card>
          </div>

          <Card className="animate-fade-up-delay-1 border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_62%)] bg-[linear-gradient(150deg,color-mix(in_oklab,var(--color-surface),white_14%),color-mix(in_oklab,var(--color-highlight),var(--color-surface)_95%))]">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <BarChart3 className="size-5 text-[var(--color-accent)]" />
                Usage Graph
              </CardTitle>
              <CardDescription>
                Visual comparison of website and audio usage
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
                    <span>Website Time</span>
                    <span>{formatDuration(summary.totalSessionSeconds)}</span>
                  </div>
                  <div className="h-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[2px]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),color-mix(in_oklab,var(--color-info),var(--color-accent)_64%))] transition-all duration-700"
                      style={{ width: `${graphStats.sessionPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
                    <span>Audio Watch Time</span>
                    <span>{formatDuration(summary.totalAudioSeconds)}</span>
                  </div>
                  <div className="h-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[2px]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-highlight),color-mix(in_oklab,var(--color-accent),var(--color-highlight)_62%))] transition-all duration-700"
                      style={{ width: `${graphStats.audioPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_64%)] bg-[color-mix(in_oklab,var(--color-surface),white_10%)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-text)]">
                  Audio Share
                </p>
                <div className="mt-3 grid place-items-center">
                  <div
                    className="grid size-32 place-items-center rounded-full border border-[var(--color-border)]"
                    style={{
                      background: `conic-gradient(var(--color-highlight) ${graphStats.audioSharePercent}%, color-mix(in_oklab,var(--color-surface-3),var(--color-border)_75%) ${graphStats.audioSharePercent}% 100%)`,
                    }}
                  >
                    <div className="grid size-24 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-text)]">
                        Audio
                      </p>
                      <p className="font-display text-2xl text-[var(--color-heading)]">
                        {graphStats.audioSharePercent}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-up-delay-2 border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_62%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-surface),white_15%),color-mix(in_oklab,var(--color-accent),var(--color-surface)_95%))]">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-[var(--color-muted-text)]">
              <Gauge className="size-4 text-[var(--color-accent)]" />
              Usage data is tracked only for authenticated users.
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
