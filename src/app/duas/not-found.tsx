import PublicContentState from '@/components/errors/public-content-state';

export default function DuaNotFound() {
  return (
    <PublicContentState
      kind="missing"
      title="Dua category not found"
      description="The requested dua category does not exist or its link has changed. Continue from the complete duas directory."
      primaryHref="/duas"
      primaryLabel="Browse all duas"
    />
  );
}
