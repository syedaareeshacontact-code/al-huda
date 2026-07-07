'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Lightbulb, LockKeyhole, MessageSquareText, Send, Star } from 'lucide-react';

import { OPEN_AUTH_MODAL_EVENT, type SessionUser } from '@/components/layout/auth-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type FeedbackCategory = 'bug' | 'feature' | 'content' | 'design' | 'general';

const categories: Array<{ value: FeedbackCategory; label: string }> = [
  { value: 'general', label: 'General' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'content', label: 'Content' },
  { value: 'design', label: 'Design' },
];

export default function FeedbackForm() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [rating, setRating] = useState(5);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as { user: SessionUser | null };
        if (!ignore) setUser(payload.user);
      } finally {
        if (!ignore) setAuthLoading(false);
      }
    };

    void loadSession();
    setPageUrl(window.location.pathname);

    return () => {
      ignore = true;
    };
  }, []);

  const canSubmit = useMemo(
    () => Boolean(user && subject.trim().length >= 3 && message.trim().length >= 10 && !submitting),
    [message, subject, submitting, user]
  );

  const openSignIn = () => {
    window.dispatchEvent(
      new CustomEvent(OPEN_AUTH_MODAL_EVENT, {
        detail: {
          tab: 'signin',
          reason: 'Please sign in to send feedback.',
        },
      })
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!user) {
      openSignIn();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          rating,
          subject,
          message,
          pageUrl,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message ?? 'Unable to send feedback.');
      }

      setStatus({ type: 'success', message: 'Feedback sent. Thank you for helping improve Read al Quran.' });
      setCategory('general');
      setRating(5);
      setSubject('');
      setMessage('');
      setPageUrl(window.location.pathname);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to send feedback.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1 text-xs font-semibold text-[var(--color-accent-soft)]">
          <MessageSquareText className="h-3.5 w-3.5" />
          Feedback
        </div>
        <div>
          <h1 className="font-display text-4xl font-semibold text-[var(--color-heading)] sm:text-5xl">
            Help improve Read al Quran
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-muted-text)]">
            Share issues, suggestions, content corrections, or UI feedback. Feedback is saved with your account so the team can review it properly.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
            <Lightbulb className="mb-3 h-5 w-5 text-[var(--color-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--color-heading)]">Useful details</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-text)]">
              Mention the page, device, and what you expected to happen.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
            <LockKeyhole className="mb-3 h-5 w-5 text-[var(--color-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--color-heading)]">Login required</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-text)]">
              Only signed-in users can submit feedback, which keeps reports accountable.
            </p>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Send Feedback</CardTitle>
          <CardDescription>
            {authLoading
              ? 'Checking your account...'
              : user
                ? `Signed in as ${user.name}`
                : 'Sign in before sending your message.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!authLoading && !user ? (
            <div className="mb-5 rounded-xl border border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_45%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_92%)] p-4">
              <p className="text-sm text-[var(--color-muted-text)]">
                Feedback is available for logged-in users only.
              </p>
              <Button type="button" className="mt-3" onClick={openSignIn}>
                <LockKeyhole className="h-4 w-4" />
                Sign In
              </Button>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--color-heading)]">Category</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {categories.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setCategory(item.value)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                      category === item.value
                        ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_82%)] text-[var(--color-accent-soft)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-text)] hover:text-[var(--color-heading)]'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--color-heading)]">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`${value} star rating`}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl border transition',
                      value <= rating
                        ? 'border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_35%)] bg-[color-mix(in_oklab,var(--color-accent),var(--color-surface)_82%)] text-[var(--color-accent)]'
                        : 'border-[var(--color-border)] text-[var(--color-muted-text)] hover:text-[var(--color-heading)]'
                    )}
                  >
                    <Star className={cn('h-4 w-4', value <= rating && 'fill-current')} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="feedback-subject" className="mb-2 block text-sm font-semibold text-[var(--color-heading)]">
                  Subject
                </label>
                <Input
                  id="feedback-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={120}
                  placeholder="Short summary"
                  required
                />
              </div>
              <div>
                <label htmlFor="feedback-page" className="mb-2 block text-sm font-semibold text-[var(--color-heading)]">
                  Page URL
                </label>
                <Input
                  id="feedback-page"
                  value={pageUrl}
                  onChange={(event) => setPageUrl(event.target.value)}
                  maxLength={240}
                  placeholder="/surah"
                />
              </div>
            </div>

            <div>
              <label htmlFor="feedback-message" className="mb-2 block text-sm font-semibold text-[var(--color-heading)]">
                Message
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={1200}
                required
                rows={7}
                placeholder="Write the issue or suggestion..."
                className="w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus-visible:border-[var(--color-accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              />
              <p className="mt-1 text-xs text-[var(--color-muted-text)]">{message.length}/1200</p>
            </div>

            {status ? (
              <div
                className={cn(
                  'flex items-start gap-2 rounded-xl border p-3 text-sm',
                  status.type === 'success'
                    ? 'border-[color-mix(in_oklab,var(--color-success),var(--color-border)_50%)] bg-[color-mix(in_oklab,var(--color-success),var(--color-surface)_90%)] text-[var(--color-heading)]'
                    : 'border-[color-mix(in_oklab,var(--color-danger),var(--color-border)_50%)] bg-[color-mix(in_oklab,var(--color-danger),var(--color-surface)_90%)] text-[var(--color-heading)]'
                )}
              >
                {status.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : null}
                <span>{status.message}</span>
              </div>
            ) : null}

            <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
              <Send className="h-4 w-4" />
              {submitting ? 'Sending...' : 'Send Feedback'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

