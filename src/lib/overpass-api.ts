const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export interface Mosque {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  denomination?: string;
  distance?: number;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findNearbyMosques(
  latitude: number,
  longitude: number,
  radiusMeters = 5000
): Promise<Mosque[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${latitude},${longitude});
      way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${latitude},${longitude});
    );
    out center body;
  `.trim();

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'ReadAlQuran/1.0 (mosque-finder)',
    },
    body: `data=${encodeURIComponent(query)}`,
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status}`);
  }

  const json = await res.json();
  const elements: Array<{
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }> = json.elements ?? [];

  const mosques: Mosque[] = [];

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const name =
      el.tags?.['name:en'] ??
      el.tags?.name ??
      el.tags?.['name:ur'] ??
      'Mosque / Masjid';

    mosques.push({
      id: el.id,
      name,
      latitude: lat,
      longitude: lon,
      address: el.tags?.['addr:street']
        ? `${el.tags['addr:street']}${el.tags['addr:city'] ? `, ${el.tags['addr:city']}` : ''}`
        : undefined,
      denomination: el.tags?.denomination,
      distance: haversineDistance(latitude, longitude, lat, lon),
    });
  }

  mosques.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  return mosques;
}

export function getGoogleMapsDirectionsUrl(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLon}&destination=${toLat},${toLon}&travelmode=walking`;
}

export function getGoogleMapsLink(lat: number, lon: number, name?: string): string {
  const label = name ? encodeURIComponent(name) : '';
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}${label ? `&query_place_id=${label}` : ''}`;
}
