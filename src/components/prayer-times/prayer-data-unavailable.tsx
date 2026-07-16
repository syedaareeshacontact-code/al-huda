export default function PrayerDataUnavailable({ cityName }: { cityName: string }) {
  return (
    <div
      className="rounded-2xl border border-[color-mix(in_oklab,var(--color-warning),var(--color-border)_55%)] bg-[color-mix(in_oklab,var(--color-warning),var(--color-surface)_94%)] p-5"
      role="status"
    >
      <h2 className="font-display text-xl font-semibold text-[var(--color-heading)]">
        Prayer times temporarily unavailable
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-muted-text)]">
        We could not verify today&apos;s prayer times for {cityName}. No estimated or placeholder
        timings are being shown. Please check your local mosque while the live data service
        recovers.
      </p>
    </div>
  );
}
