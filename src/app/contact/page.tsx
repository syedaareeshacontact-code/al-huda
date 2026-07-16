import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Read al Quran - Pakistan | Get in Touch',
  description:
    'Contact Read al Quran team in Pakistan. Support, feedback, or partnership inquiries. Available in Urdu, English, and Arabic.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[color:var(--color-bg)]">
      <div className="container mx-auto px-4 py-16 md:py-24 text-[color:var(--color-text)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-[color:var(--color-heading)] mb-4">
              Contact Read al Quran
            </h1>
            <p className="text-xl text-[color:var(--color-muted-text)]">
              Get in touch with our team. We&apos;re here to help!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] p-8 rounded-3xl shadow-card">
              <h3 className="text-xl font-semibold text-[color:var(--color-accent)] mb-3">Email</h3>
              <p className="text-[color:var(--color-muted-text)] mb-2">General Inquiries:</p>
              <a href="mailto:zainqlandar@gmail.com" className="text-[color:var(--color-info)] hover:underline">
                zainqlandar@gmail.com
              </a>
              <p className="text-[color:var(--color-muted-text)] mt-4 text-sm">
                Use the same address for support, corrections, and partnership inquiries.
              </p>
            </div>

            <div className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] p-8 rounded-3xl shadow-card">
              <h3 className="text-xl font-semibold text-[color:var(--color-accent)] mb-3">Phone</h3>
              <p className="text-[color:var(--color-muted-text)] mb-2">Pakistan (Local):</p>
              <a href="tel:+923364157981" className="text-[color:var(--color-info)] hover:underline">
                +923364157981
              </a>
              <p className="text-[color:var(--color-muted-text)] mt-4 mb-2">WhatsApp:</p>
              <a href="https://wa.me/923364157981" className="text-[color:var(--color-info)] hover:underline">
                Chat on WhatsApp
              </a>
            </div>

            <div className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] p-8 rounded-3xl shadow-card">
              <h3 className="text-xl font-semibold text-[color:var(--color-accent)] mb-3">Location</h3>
              <p className="text-[color:var(--color-muted-text)]">
                Islamabad<br />
                Pakistan
              </p>
              <p className="text-[color:var(--color-muted-text)] text-sm mt-4">
                Response times vary. Urgent religious questions should be referred to a qualified local scholar.
              </p>
            </div>
          </div>

          <div className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] p-8 rounded-3xl shadow-card">
            <h2 className="text-2xl font-semibold text-[color:var(--color-heading)] mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <details className="group">
                <summary className="cursor-pointer text-lg font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-highlight)]">
                  How can I report a bug?
                </summary>
                <p className="mt-2 text-[color:var(--color-muted-text)] pl-4">
                  Please email us at zainqlandar@gmail.com or use the feedback page with details about the bug.
                </p>
              </details>

              <details className="group">
                <summary className="cursor-pointer text-lg font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-highlight)]">
                  Is Read al Quran available offline?
                </summary>
                <p className="mt-2 text-[color:var(--color-muted-text)] pl-4">
                  The installable app provides an offline fallback and may retain previously loaded public assets and Quran data. Complete offline availability is not guaranteed.
                </p>
              </details>

              <details className="group">
                <summary className="cursor-pointer text-lg font-semibold text-[color:var(--color-accent)] hover:text-[color:var(--color-highlight)]">
                  Does it have Urdu translation?
                </summary>
                <p className="mt-2 text-[color:var(--color-muted-text)] pl-4">
                  Yes, complete Quran with Urdu translation and tafseer.
                </p>
              </details>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
