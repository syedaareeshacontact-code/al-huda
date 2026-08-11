'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ExternalLink, Loader2, MapPin } from 'lucide-react';

import type { Mosque } from '@/lib/overpass-api';
import { getGoogleMapsLink } from '@/lib/overpass-api';

const MAPTILER_SDK_ID = 'maptiler-sdk-script';
const MAPTILER_STYLES_ID = 'maptiler-sdk-styles';
const MAPTILER_SDK_URL = 'https://cdn.maptiler.com/maptiler-sdk-js/v4.0.2/maptiler-sdk.umd.min.js';
const MAPTILER_STYLES_URL = 'https://cdn.maptiler.com/maptiler-sdk-js/v4.0.2/maptiler-sdk.css';

type MapInstance = {
  remove: () => void;
};

type MarkerInstance = {
  setLngLat: (coordinates: [number, number]) => MarkerInstance;
  setPopup: (popup: unknown) => MarkerInstance;
  addTo: (map: MapInstance) => MarkerInstance;
  remove: () => void;
};

type MapTilerSdk = {
  Map: new (options: Record<string, unknown>) => MapInstance;
  Marker: new (options?: Record<string, unknown>) => MarkerInstance;
  Popup: new (options?: Record<string, unknown>) => {
    setDOMContent: (content: HTMLElement) => unknown;
  };
  MapStyle: { STREETS: unknown };
};

declare global {
  interface Window {
    maptilersdk?: MapTilerSdk;
  }
}

function loadMapTilerSdk(): Promise<MapTilerSdk> {
  if (window.maptilersdk) {
    return Promise.resolve(window.maptilersdk);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(MAPTILER_SDK_ID) as HTMLScriptElement | null;

    const onLoad = () => {
      if (window.maptilersdk) {
        resolve(window.maptilersdk);
      } else {
        reject(new Error('Map SDK did not initialize.'));
      }
    };

    if (existingScript) {
      existingScript.addEventListener('load', onLoad, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Map SDK failed to load.')), {
        once: true,
      });
      return;
    }

    if (!document.getElementById(MAPTILER_STYLES_ID)) {
      const styles = document.createElement('link');
      styles.id = MAPTILER_STYLES_ID;
      styles.rel = 'stylesheet';
      styles.href = MAPTILER_STYLES_URL;
      document.head.appendChild(styles);
    }

    const script = document.createElement('script');
    script.id = MAPTILER_SDK_ID;
    script.src = MAPTILER_SDK_URL;
    script.async = true;
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', () => reject(new Error('Map SDK failed to load.')), { once: true });
    document.head.appendChild(script);
  });
}

interface MosqueMapProps {
  latitude: number;
  longitude: number;
  cityName?: string;
  mosques: Mosque[];
}

function MapFallback({ message, googleMapsUrl }: { message: string; googleMapsUrl: string }) {
  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-center">
      <AlertCircle className="size-7 text-[var(--color-accent)]" aria-hidden="true" />
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--color-muted-text)]">{message}</p>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-semibold text-[var(--color-heading)] transition hover:border-[var(--color-accent-soft)]"
      >
        <MapPin className="size-4 text-[var(--color-accent)]" aria-hidden="true" />
        Open in Google Maps
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}

export default function MosqueMap({ latitude, longitude, cityName, mosques }: MosqueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const sdkRef = useRef<MapTilerSdk | null>(null);
  const markersRef = useRef<MarkerInstance[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
  const mapLabel = cityName ? `Mosque map — ${cityName}` : 'Mosque map';
  const googleMapsUrl = getGoogleMapsLink(latitude, longitude, cityName);

  useEffect(() => {
    if (!apiKey || !mapContainerRef.current) {
      return;
    }

    let cancelled = false;

    async function initializeMap() {
      try {
        const sdk = await loadMapTilerSdk();
        if (cancelled || !mapContainerRef.current) return;

        sdkRef.current = sdk;
        mapRef.current?.remove();
        mapRef.current = new sdk.Map({
          container: mapContainerRef.current,
          apiKey,
          style: sdk.MapStyle.STREETS,
          center: [longitude, latitude],
          zoom: 12,
          navigationControl: true,
        });
        setMapReady(true);
      } catch {
        if (!cancelled) {
          setMapError('The map could not be loaded right now.');
        }
      }
    }

    setMapReady(false);
    setMapError(null);
    initializeMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [apiKey, latitude, longitude]);

  useEffect(() => {
    const sdk = sdkRef.current;
    const map = mapRef.current;
    if (!mapReady || !sdk || !map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const centerPopup = document.createElement('p');
    centerPopup.className = 'font-semibold';
    centerPopup.textContent = cityName ? `${cityName} search area` : 'Search area';
    const centerMarker = new sdk.Marker({ color: '#2563eb' })
      .setLngLat([longitude, latitude])
      .setPopup(new sdk.Popup({ offset: 22 }).setDOMContent(centerPopup))
      .addTo(map);
    markersRef.current.push(centerMarker);

    mosques.forEach((mosque) => {
      const popup = document.createElement('div');
      const name = document.createElement('p');
      name.className = 'font-semibold';
      name.textContent = mosque.name;
      popup.appendChild(name);

      if (mosque.distance != null) {
        const distance = document.createElement('p');
        distance.className = 'mt-1 text-xs';
        distance.textContent = mosque.distance < 1
          ? `${Math.round(mosque.distance * 1000)}m away`
          : `${mosque.distance.toFixed(1)} km away`;
        popup.appendChild(distance);
      }

      const mosqueMarker = new sdk.Marker({ color: '#a67c00' })
        .setLngLat([mosque.longitude, mosque.latitude])
        .setPopup(new sdk.Popup({ offset: 22 }).setDOMContent(popup))
        .addTo(map);
      markersRef.current.push(mosqueMarker);
    });
  }, [cityName, latitude, longitude, mapReady, mosques]);

  return (
    <section aria-label={mapLabel} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      {!apiKey
        ? <MapFallback
            message="Map setup is incomplete. You can still open this area directly in Google Maps."
            googleMapsUrl={googleMapsUrl}
          />
        : mapError
          ? <MapFallback message={mapError} googleMapsUrl={googleMapsUrl} />
          : (
              <div className="relative overflow-hidden rounded-xl">
                {!mapReady && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-[var(--color-surface)] text-sm text-[var(--color-muted-text)]">
                    <Loader2 className="size-5 animate-spin text-[var(--color-accent)]" aria-hidden="true" />
                    Loading map…
                  </div>
                )}
                <div ref={mapContainerRef} className="h-[350px] w-full" />
              </div>
            )}
      <p className="mt-2 text-center text-xs text-[var(--color-muted-text)]">
        Map data ©{' '}
        <a href="https://www.openstreetmap.org/copyright" className="underline" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>{' '}
        contributors
      </p>
    </section>
  );
}
