'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Mosque } from '@/lib/overpass-api';
import { getGoogleMapsDirectionsUrl, getGoogleMapsLink } from '@/lib/overpass-api';
import MosqueMap from '@/components/mosque-finder/mosque-map';

interface MosqueFinderClientProps {
  defaultLat?: number;
  defaultLon?: number;
  cityName?: string;
}

export default function MosqueFinderClient({
  defaultLat,
  defaultLon,
  cityName,
}: MosqueFinderClientProps) {
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState(defaultLat ?? null);
  const [userLon, setUserLon] = useState(defaultLon ?? null);
  const [radius, setRadius] = useState(5000);

  const fetchMosques = useCallback(async (lat: number, lon: number, r: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mosques/nearby?lat=${lat}&lon=${lon}&radius=${r}`);
      if (!res.ok) throw new Error('Failed to fetch mosques');
      const data = await res.json();
      setMosques(data.mosques ?? []);
      if (data.mosques?.length === 0) {
        setError('No mosques found in this area. Try increasing the search radius.');
      }
    } catch {
      setError('Unable to load mosque data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (defaultLat && defaultLon) {
      fetchMosques(defaultLat, defaultLon, radius);
    }
  }, [defaultLat, defaultLon, fetchMosques, radius]);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    if (!window.isSecureContext) {
      setError('Location access requires HTTPS or localhost. Please open this page on a secure URL.');
      return;
    }

    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude);
        setUserLon(longitude);
        fetchMosques(latitude, longitude, radius);
      },
      (geoError) => {
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location permission is blocked. Please allow location access in your browser settings, then try again.'
            : geoError.code === geoError.POSITION_UNAVAILABLE
              ? 'Your current location is unavailable. Please try again or select a city.'
              : geoError.code === geoError.TIMEOUT
                ? 'Location request timed out. Please try again or select a city.'
                : 'Unable to get your location. Please try again or select a city.';

        setError(message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  };

  const handleSearch = () => {
    if (userLat && userLon) {
      fetchMosques(userLat, userLon, radius);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-5 py-2.5 text-sm font-bold text-[var(--color-accent-foreground)] transition hover:brightness-110 disabled:opacity-60"
        >
          <Navigation className="h-4 w-4" />
          Use My Location
        </button>

        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm"
        >
          <option value={2000}>2 km radius</option>
          <option value={5000}>5 km radius</option>
          <option value={10000}>10 km radius</option>
          <option value={20000}>20 km radius</option>
        </select>

        {userLat && userLon && (
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold transition hover:border-[var(--color-accent-soft)]"
          >
            Search Again
          </button>
        )}
      </div>

      {cityName && !loading && mosques.length > 0 && (
        <p className="text-sm text-[var(--color-muted-text)]">
          Found <strong>{mosques.length}</strong> mosques near {cityName}
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-12 text-[var(--color-muted-text)]">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Searching for nearby mosques...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-muted-text)]">
          <AlertCircle className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {mosques.map((mosque) => (
          <Card key={mosque.id} className="transition hover:shadow-[var(--shadow-card)]">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] text-lg">
                  🕌
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[var(--color-heading)]">{mosque.name}</h3>
                  {mosque.address && (
                    <p className="mt-1 text-xs text-[var(--color-muted-text)]">{mosque.address}</p>
                  )}
                  {mosque.distance != null && (
                    <p className="mt-2 text-xs font-semibold text-[var(--color-accent)]">
                      {mosque.distance < 1
                        ? `${Math.round(mosque.distance * 1000)}m away`
                        : `${mosque.distance.toFixed(1)} km away`}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={getGoogleMapsLink(mosque.latitude, mosque.longitude, mosque.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--color-accent-soft)]"
                    >
                      <MapPin className="h-3 w-3" /> View on Map
                    </a>
                    {userLat && userLon && (
                      <a
                        href={getGoogleMapsDirectionsUrl(userLat, userLon, mosque.latitude, mosque.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--color-accent-soft)]"
                      >
                        <Navigation className="h-3 w-3" /> Directions
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mosques.length > 0 && (
        <MosqueMap
          latitude={userLat ?? defaultLat ?? 31.52}
          longitude={userLon ?? defaultLon ?? 74.36}
          cityName={cityName}
          mosques={mosques}
        />
      )}
    </div>
  );
}
