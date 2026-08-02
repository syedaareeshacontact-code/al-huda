import PublicContentState from '@/components/errors/public-content-state';

export default function HadithNotFound() {
  return (
    <PublicContentState
      kind="missing"
      title="Hadith page not found"
      description="This collection, chapter, or Hadith number is unavailable. Browse the verified library or search for another narration."
      primaryHref="/hadith"
      primaryLabel="Browse Hadith collections"
    />
  );
}
