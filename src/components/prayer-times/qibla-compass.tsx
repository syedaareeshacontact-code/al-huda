'use client';

interface QiblaCompassProps {
  direction: number;
  latitude: number;
  longitude: number;
  cityName?: string;
}

export default function QiblaCompass({
  direction,
  latitude,
  longitude,
  cityName,
}: QiblaCompassProps) {
  const cardinalDirection = getCardinalDirection(direction);

  return (
    <div className="flex flex-col items-center">
      <div className="relative mx-auto h-56 w-56 md:h-64 md:w-64">
        {/* Compass ring */}
        <div className="absolute inset-0 rounded-full border-4 border-[color-mix(in_oklab,var(--color-accent),var(--color-border)_50%)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
          {/* Cardinal labels */}
          {['N', 'E', 'S', 'W'].map((label, i) => (
            <span
              key={label}
              className="absolute text-xs font-bold text-[var(--color-muted-text)]"
              style={{
                top: i === 0 ? '8px' : i === 2 ? 'auto' : '50%',
                bottom: i === 2 ? '8px' : 'auto',
                left: i === 3 ? '8px' : i === 1 ? 'auto' : '50%',
                right: i === 1 ? '8px' : 'auto',
                transform:
                  i === 0 || i === 2
                    ? 'translateX(-50%)'
                    : 'translateY(-50%)',
              }}
            >
              {label}
            </span>
          ))}

          {/* Qibla needle */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-700"
            style={{ transform: `rotate(${direction}deg)` }}
          >
            <div className="flex flex-col items-center">
              <div
                className="h-20 w-1 rounded-full md:h-24"
                style={{
                  background:
                    'linear-gradient(to top, transparent, var(--color-accent-soft))',
                }}
              />
              <div className="mt-[-4px] h-0 w-0 border-x-[10px] border-b-[20px] border-x-transparent border-b-[var(--color-accent)]" />
            </div>
          </div>

          {/* Kaaba icon at center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-xl shadow-inner">
              🕋
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-[var(--color-muted-text)]">
          Qibla Direction{cityName ? ` from ${cityName}` : ''}
        </p>
        <p className="mt-1 font-display text-3xl font-bold text-[var(--color-heading)]">
          {Math.round(direction)}° <span className="text-lg text-[var(--color-accent-soft)]">{cardinalDirection}</span>
        </p>
        <p className="mt-2 text-xs text-[var(--color-muted-text)]">
          {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
        </p>
      </div>
    </div>
  );
}

function getCardinalDirection(degrees: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(degrees / 22.5) % 16];
}
