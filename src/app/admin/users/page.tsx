'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Clock3,
  Headphones,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  RefreshCcw,
  Search,
  Star,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  loginCount: number;
  lastLoginAt: string | null;
  totalSessionSeconds: number;
  totalAudioSeconds: number;
  favoriteSurahIds: number[];
  bookmarkedAyahs: Array<{
    surahId: number;
    ayahNumber: number;
    createdAt: string;
  }>;
}

interface AdminUsageSummary {
  totalUsers: number;
  totalSessionSeconds: number;
  totalAudioSeconds: number;
}

interface AdminFeedbackRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: 'bug' | 'feature' | 'content' | 'design' | 'general';
  rating: number;
  subject: string;
  message: string;
  pageUrl: string | null;
  status: 'new' | 'reviewed' | 'closed';
  createdAt: string;
  updatedAt: string;
}

interface AdminUsersPayload {
  users?: AdminUserRecord[];
  feedback?: AdminFeedbackRecord[];
  summary?: AdminUsageSummary;
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

function formatDate(value: string | null) {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid';
  }

  return date.toLocaleString();
}

function formatFavoriteSurahs(ids: number[]) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return 'None';
  }

  return ids.join(', ');
}

function formatBookmarkedAyahs(
  bookmarks: Array<{ surahId: number; ayahNumber: number }>
) {
  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    return 'None';
  }

  const preview = bookmarks
    .slice(0, 3)
    .map((bookmark) => `${bookmark.surahId}:${bookmark.ayahNumber}`)
    .join(', ');
  const remaining = bookmarks.length - 3;
  if (remaining > 0) {
    return `${preview} +${remaining}`;
  }

  return preview;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedbackRecord[]>([]);
  const [summary, setSummary] = useState<AdminUsageSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/users', {
        cache: 'no-store',
      });

      const payload = (await response.json()) as AdminUsersPayload;

      if (!response.ok) {
        setError(payload.message ?? 'Unable to load users.');
        return;
      }

      const nextUsers = Array.isArray(payload.users) ? payload.users : [];
      const nextFeedback = Array.isArray(payload.feedback) ? payload.feedback : [];
      setUsers(nextUsers);
      setFeedback(nextFeedback);

      const nextSummary = payload.summary ?? nextUsers.reduce<AdminUsageSummary>(
        (acc, user) => {
          acc.totalUsers += 1;
          acc.totalSessionSeconds += user.totalSessionSeconds;
          acc.totalAudioSeconds += user.totalAudioSeconds;
          return acc;
        },
        { ...EMPTY_SUMMARY }
      );

      setSummary({
        totalUsers: Math.max(0, Number(nextSummary.totalUsers) || 0),
        totalSessionSeconds: Math.max(0, Number(nextSummary.totalSessionSeconds) || 0),
        totalAudioSeconds: Math.max(0, Number(nextSummary.totalAudioSeconds) || 0),
      });
    } catch {
      setError('Unable to load users right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, users]);

  const filteredFeedback = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return feedback;
    }

    return feedback.filter((entry) => {
      return (
        entry.userName.toLowerCase().includes(normalizedQuery) ||
        entry.userEmail.toLowerCase().includes(normalizedQuery) ||
        entry.subject.toLowerCase().includes(normalizedQuery) ||
        entry.message.toLowerCase().includes(normalizedQuery) ||
        entry.category.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [feedback, query]);

  return (
    <div className="pb-16 pt-10" data-slot="page-shell">
      <section className="mb-6 animate-fade-up">
        <Badge className="mb-2">Admin</Badge>
        <h1 className="font-display text-4xl text-[var(--color-heading)]">Users Table</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-text)]">
          Login users, total time spent, and audio watch time tracking.
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
                className="block rounded-lg border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_65%)] px-3 py-2 text-sm transition hover:bg-[color-mix(in_oklab,var(--color-surface-2),white_10%)]"
              >
                Tracking Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="block rounded-lg border border-[color-mix(in_oklab,var(--color-accent),var(--color-accent)_52%)] bg-[color-mix(in_oklab,var(--color-surface-2),white_8%)] px-3 py-2 text-sm font-semibold text-[var(--color-heading)]"
              >
                Users Table
              </Link>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <Card className="animate-fade-up">
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-2 text-xs text-[var(--color-text)] sm:grid-cols-4 sm:text-sm">
                <p className="flex items-center gap-1.5">
                  <Users className="size-4 text-[var(--color-accent)]" />
                  Logged-in Users: <span className="font-semibold">{summary.totalUsers}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock3 className="size-4 text-[var(--color-info)]" />
                  Website Time:{' '}
                  <span className="font-semibold">
                    {formatDuration(summary.totalSessionSeconds)}
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Headphones className="size-4 text-[var(--color-highlight)]" />
                  Audio Time:{' '}
                  <span className="font-semibold">
                    {formatDuration(summary.totalAudioSeconds)}
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <MessageSquareText className="size-4 text-[var(--color-accent)]" />
                  Feedback: <span className="font-semibold">{feedback.length}</span>
                </p>
              </div>

              <div className="flex w-full gap-2 lg:w-auto">
                <div className="relative w-full lg:min-w-[18rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-text)]" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search user name or email"
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void loadUsers()}
                  aria-label="Refresh users"
                >
                  <RefreshCcw className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {error ? (
            <Card>
              <CardContent className="p-4 text-sm text-[var(--color-danger)]">{error}</CardContent>
            </Card>
          ) : null}

          <div className="grid gap-3 md:hidden">
            {loading ? (
              <Card>
                <CardContent className="p-4 text-sm text-[var(--color-muted-text)]">
                  Users loading...
                </CardContent>
              </Card>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Card key={user.id} className="border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_66%)]">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--color-heading)]">{user.name}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--color-muted-text)]">
                          <Mail className="size-3.5" />
                          {user.email}
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-text)]">
                        Logins {user.loginCount}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2">
                        <p className="text-[var(--color-muted-text)]">Time Spent</p>
                        <p className="mt-1 font-semibold text-[var(--color-heading)]">
                          {formatDuration(user.totalSessionSeconds)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2">
                        <p className="text-[var(--color-muted-text)]">Audio Time</p>
                        <p className="mt-1 font-semibold text-[var(--color-heading)]">
                          {formatDuration(user.totalAudioSeconds)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-[var(--color-muted-text)]">
                      <p>
                        Favorite Surahs:{' '}
                        <span className="font-semibold text-[var(--color-text)]">
                          {formatFavoriteSurahs(user.favoriteSurahIds)}
                        </span>
                      </p>
                      <p>
                        Bookmarks:{' '}
                        <span className="font-semibold text-[var(--color-text)]">
                          {formatBookmarkedAyahs(user.bookmarkedAyahs)}
                        </span>
                      </p>
                      <p>
                        Last Login:{' '}
                        <span className="font-semibold text-[var(--color-text)]">
                          {formatDate(user.lastLoginAt)}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-4 text-sm text-[var(--color-muted-text)]">
                  No logged-in users found.
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="hidden md:block animate-fade-up-delay-1 border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_66%)]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <thead className="bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-surface-2),white_12%),color-mix(in_oklab,var(--color-highlight),var(--color-surface-2)_94%))] text-xs uppercase tracking-[0.14em] text-[var(--color-muted-text)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Logins</th>
                      <th className="px-4 py-3 font-semibold">Time Spent</th>
                      <th className="px-4 py-3 font-semibold">Audio Time</th>
                      <th className="px-4 py-3 font-semibold">Favorite Surahs</th>
                      <th className="px-4 py-3 font-semibold">Bookmarks</th>
                      <th className="px-4 py-3 font-semibold">Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-5 text-center text-[var(--color-muted-text)]"
                        >
                          Users loading...
                        </td>
                      </tr>
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-t border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_74%)] align-top transition-colors hover:bg-[color-mix(in_oklab,var(--color-surface-2),white_8%)]"
                        >
                          <td className="px-4 py-3 font-semibold text-[var(--color-heading)]">
                            {user.name}
                            <p className="mt-0.5 text-xs font-normal text-[var(--color-muted-text)]">
                              Joined: {formatDate(user.createdAt)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-[var(--color-text)]">{user.email}</td>
                          <td className="px-4 py-3 text-[var(--color-text)]">{user.loginCount}</td>
                          <td className="px-4 py-3 text-[var(--color-text)]">
                            {formatDuration(user.totalSessionSeconds)}
                          </td>
                          <td className="px-4 py-3 text-[var(--color-text)]">
                            {formatDuration(user.totalAudioSeconds)}
                          </td>
                          <td className="px-4 py-3 text-[var(--color-text)]">
                            {formatFavoriteSurahs(user.favoriteSurahIds)}
                          </td>
                          <td className="px-4 py-3 text-[var(--color-text)]">
                            {formatBookmarkedAyahs(user.bookmarkedAyahs)}
                          </td>
                          <td className="px-4 py-3 text-[var(--color-text)]">
                            {formatDate(user.lastLoginAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-5 text-center text-[var(--color-muted-text)]"
                        >
                          No logged-in users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-3 pt-4">
            <div>
              <h2 className="font-display text-2xl text-[var(--color-heading)]">Feedback Table</h2>
              <p className="mt-1 text-sm text-[var(--color-muted-text)]">
                Messages sent by signed-in users from the feedback page.
              </p>
            </div>

            <div className="grid gap-3 md:hidden">
              {loading ? (
                <Card>
                  <CardContent className="p-4 text-sm text-[var(--color-muted-text)]">
                    Feedback loading...
                  </CardContent>
                </Card>
              ) : filteredFeedback.length > 0 ? (
                filteredFeedback.map((entry) => (
                  <Card
                    key={entry.id}
                    className="border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_66%)]"
                  >
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--color-heading)]">
                            {entry.subject}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--color-muted-text)]">
                            <Mail className="size-3.5" />
                            {entry.userName} - {entry.userEmail}
                          </p>
                        </div>
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-text)]">
                          {entry.status}
                        </span>
                      </div>

                      <p className="text-sm text-[var(--color-text)]">{entry.message}</p>

                      <div className="flex flex-wrap gap-2 text-xs text-[var(--color-muted-text)]">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-1">
                          <MessageSquareText className="size-3.5" />
                          {entry.category}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-1">
                          <Star className="size-3.5 fill-current text-[var(--color-accent)]" />
                          {entry.rating}/5
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] px-2 py-1">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-4 text-sm text-[var(--color-muted-text)]">
                    No feedback found.
                  </CardContent>
                </Card>
              )}
            </div>

            <Card className="hidden animate-fade-up-delay-1 border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_66%)] md:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-left text-sm">
                    <thead className="bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-surface-2),white_12%),color-mix(in_oklab,var(--color-highlight),var(--color-surface-2)_94%))] text-xs uppercase tracking-[0.14em] text-[var(--color-muted-text)]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">User</th>
                        <th className="px-4 py-3 font-semibold">Subject</th>
                        <th className="px-4 py-3 font-semibold">Message</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold">Rating</th>
                        <th className="px-4 py-3 font-semibold">Page</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-5 text-center text-[var(--color-muted-text)]"
                          >
                            Feedback loading...
                          </td>
                        </tr>
                      ) : filteredFeedback.length > 0 ? (
                        filteredFeedback.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-t border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_74%)] align-top transition-colors hover:bg-[color-mix(in_oklab,var(--color-surface-2),white_8%)]"
                          >
                            <td className="px-4 py-3 font-semibold text-[var(--color-heading)]">
                              {entry.userName}
                              <p className="mt-0.5 text-xs font-normal text-[var(--color-muted-text)]">
                                {entry.userEmail}
                              </p>
                            </td>
                            <td className="max-w-[180px] px-4 py-3 text-[var(--color-text)]">
                              {entry.subject}
                            </td>
                            <td className="max-w-[320px] px-4 py-3 text-[var(--color-text)]">
                              <p className="line-clamp-4">{entry.message}</p>
                            </td>
                            <td className="px-4 py-3 capitalize text-[var(--color-text)]">
                              {entry.category}
                            </td>
                            <td className="px-4 py-3 text-[var(--color-text)]">
                              {entry.rating}/5
                            </td>
                            <td className="max-w-[160px] px-4 py-3 text-[var(--color-text)]">
                              {entry.pageUrl ?? 'None'}
                            </td>
                            <td className="px-4 py-3 capitalize text-[var(--color-text)]">
                              {entry.status}
                            </td>
                            <td className="px-4 py-3 text-[var(--color-text)]">
                              {formatDate(entry.createdAt)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-5 text-center text-[var(--color-muted-text)]"
                          >
                            No feedback found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </section>
      </div>
    </div>
  );
}
