import PublicContentState from '@/components/errors/public-content-state';

export default function MosqueFinderNotFound() {
  return (
    <PublicContentState
      kind="missing"
      title="Mosque-finder city not found"
      description="That city is not available in our directory. Open the mosque finder and choose a supported location."
      primaryHref="/mosque-finder"
      primaryLabel="Open mosque finder"
    />
  );
}
