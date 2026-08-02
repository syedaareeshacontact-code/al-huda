import PublicContentState from '@/components/errors/public-content-state';

export default function TafsirNotFound() {
  return (
    <PublicContentState
      kind="missing"
      title="Tafseer page not found"
      description="The requested Surah or Ayah tafseer is not available. Browse the tafseer index for pages that have reviewed source content."
      primaryHref="/tafsir"
      primaryLabel="Browse tafseer"
    />
  );
}
