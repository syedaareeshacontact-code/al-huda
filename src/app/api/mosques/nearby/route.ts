import { NextRequest, NextResponse } from 'next/server';
import { findNearbyMosques } from '@/lib/overpass-api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');
  const radius = parseInt(searchParams.get('radius') ?? '5000', 10);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  if (radius < 500 || radius > 50000) {
    return NextResponse.json({ error: 'Radius must be between 500m and 50km' }, { status: 400 });
  }

  try {
    const mosques = await findNearbyMosques(lat, lon, radius);
    return NextResponse.json(
      { mosques, count: mosques.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    console.error('Mosque finder API error:', error);
    return NextResponse.json({ error: 'Failed to fetch mosque data' }, { status: 502 });
  }
}
