import PublicContentState from '@/components/errors/public-content-state';

export default function SurahNotFound() {
  return (
    <PublicContentState
      kind="missing"
      title="Quran page not found"
      description="The requested Surah or Ayah does not exist. Continue from the complete Quran index."
      primaryHref="/surah"
      primaryLabel="Browse all Surahs"
    />
  );
}
