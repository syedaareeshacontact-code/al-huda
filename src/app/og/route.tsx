import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

function sanitize(input: string | null, fallback: string) {
  const normalized = String(input ?? '').trim();
  return normalized ? normalized.slice(0, 90) : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = sanitize(searchParams.get('kind'), 'quran');
  const variant = sanitize(searchParams.get('variant'), 'index');
  const book = sanitize(searchParams.get('book'), '');
  const hadithNumber = sanitize(searchParams.get('number'), '');
  const surah = sanitize(searchParams.get('surah'), '');
  const ayah = sanitize(searchParams.get('ayah'), '');

  const title =
    kind === 'hadith'
      ? variant === 'detail' && book && hadithNumber
        ? `Hadith ${hadithNumber} – ${book}`.trim()
        : variant === 'collection' && book
          ? book
          : 'Hadith Collections'
      : kind === 'tafsir'
        ? `Urdu Tafseer ${surah && ayah ? `${surah}:${ayah}` : ''}`.trim()
        : kind === 'ayah'
          ? `Ayah ${surah && ayah ? `${surah}:${ayah}` : ''}`.trim()
          : kind === 'surah'
            ? `Surah ${surah}`.trim()
            : 'Read al Quran';

  const subtitle =
    kind === 'hadith'
      ? 'Arabic • English • Urdu • Authentic Collections'
      : kind === 'surah-index'
        ? 'Surah Index • Arabic • Urdu • Audio'
        : 'Arabic Text • Urdu Translation • Audio';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            kind === 'hadith'
              ? 'linear-gradient(135deg, #1a1408 0%, #3d2e10 40%, #5c4518 100%)'
              : 'linear-gradient(135deg, #0b2017 0%, #13382b 40%, #1f5843 100%)',
          color: '#ecfff8',
          padding: '72px',
          fontFamily: 'system-ui',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 34,
            opacity: 0.95,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.28)',
            }}
          >
            AQ
          </div>
          Read al Quran
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.08,
              fontWeight: 700,
              maxWidth: '100%',
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 30, opacity: 0.85 }}>{subtitle}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'x-robots-tag': 'noindex',
        'cache-control': 'public, max-age=31536000, immutable',
      },
    }
  );
}
