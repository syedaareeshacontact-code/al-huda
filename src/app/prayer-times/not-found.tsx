import PublicContentState from '@/components/errors/public-content-state';

export default function PrayerTimesNotFound() {
  return (
    <PublicContentState
      kind="missing"
      title="Prayer-times city not found"
      description="We do not have a prayer-times page for that city. Choose a supported city from the prayer-times directory."
      primaryHref="/prayer-times"
      primaryLabel="Choose a city"
    />
  );
}
