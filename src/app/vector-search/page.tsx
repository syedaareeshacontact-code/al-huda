import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VectorSearchTools } from '@/components/vector-search';

export const metadata: Metadata = {
  title: 'AI-Powered Quran Search - Read al Quran',
  description: 'Search the Quran by meaning and ask AI questions about Islamic knowledge',
  robots: {
    index: false, // Don't index demo page
  },
};

export default function VectorSearchPage() {
  return (
    <main className="min-h-screen bg-(--color-bg) container mx-auto px-4 py-12 max-w-4xl text-(--color-text)">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="mb-4 bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] bg-clip-text font-display text-4xl font-bold text-transparent md:text-5xl">
            AI-Powered Quran Explorer
          </h1>
          <p className="mb-6 text-lg text-[var(--color-muted-text)]">
            Discover the Quran through semantic search and AI-powered insights
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            <div className="bg-(--color-surface) border border-(--color-border) rounded-lg p-4">
              <h3 className="font-semibold text-(--color-heading) mb-2">
                🔍 Semantic Search
              </h3>
              <p className="text-sm text-(--color-text)">
                Find Surahs and Ayahs by meaning, not just keywords
              </p>
            </div>
            <div className="bg-(--color-surface) border border-(--color-border) rounded-lg p-4">
              <h3 className="font-semibold text-(--color-heading) mb-2">
                🤖 AI Scholar
              </h3>
              <p className="text-sm text-(--color-text)">
                Ask questions and get AI-powered answers with Quranic sources
              </p>
            </div>
          </div>
        </div>

        {/* Tools */}
        <Suspense
          fallback={
            <div className="space-y-6 animate-pulse">
              <div className="h-96 bg-(--color-surface-2) rounded-lg" />
              <div className="h-96 bg-(--color-surface-2) rounded-lg" />
            </div>
          }
        >
          <VectorSearchTools />
        </Suspense>

        {/* Info Section */}
        <div className="mt-12 bg-(--color-surface) rounded-lg p-8 space-y-4 border border-(--color-border)">
          <h2 className="text-2xl font-bold text-(--color-heading) mb-4">
            Example Searches
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-(--color-heading) mb-2">
                📚 Semantic Search Examples:
              </h3>
              <ul className="space-y-1 text-sm text-(--color-text)">
                <li>• &quot;Surahs about patience and perseverance&quot;</li>
                <li>• &quot;Verses on the Day of Judgment&quot;</li>
                <li>• &quot;Guidance and wisdom&quot;</li>
                <li>• &quot;Protection and seeking refuge&quot;</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-(--color-heading) mb-2">
                ❓ Q&A Examples:
              </h3>
              <ul className="space-y-1 text-sm text-(--color-text)">
                <li>• &quot;What does Ayat ul Kursi mean?&quot;</li>
                <li>• &quot;What are the benefits of Surah Yasin?&quot;</li>
                <li>• &quot;How does Islam teach compassion?&quot;</li>
                <li>• &quot;What is the significance of Surah Al-Fatiha?&quot;</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-(--color-surface-2) border border-(--color-border) rounded-lg">
            <p className="text-sm text-(--color-text)">
              <strong>💡 Tip:</strong> The more specific your question, the better the AI responses will be.
              Try rephrasing your question to get more relevant results.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-(--color-muted-text) border-t border-(--color-border) pt-8">
          <p>
            Powered by OpenAI embeddings and MongoDB Vector Search. All content from the Quran.
          </p>
        </div>
      </main>
  );
}
