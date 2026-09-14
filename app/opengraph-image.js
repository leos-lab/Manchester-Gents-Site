/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import { getOgLogoDataUrl } from '@/lib/og';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 3600;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  const logo = getOgLogoDataUrl();
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(140deg, #111f33 0%, #0b1523 60%, #1c2f4d 100%)',
          color: '#f7f4ed',
          gap: 48,
          textAlign: 'center',
          padding: '80px'
        }}
      >
        <img
          src={logo}
          alt="Manchester Gents"
          width={420}
          height={160}
          style={{ objectFit: 'contain', marginBottom: '8px' }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            maxWidth: 760,
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: 28, letterSpacing: 8, textTransform: 'uppercase', opacity: 0.7, textAlign: 'center' }}>
            Relaxed socials for suited gents
          </span>
          <h1 style={{ fontSize: 72, margin: 0, lineHeight: 1.1, textAlign: 'center' }}>Manchester Gents</h1>
          <p style={{ fontSize: 28, margin: 0, opacity: 0.8, textAlign: 'center' }}>
            Tailored evenings at The Lodge • Drinks, conversation, effortless style
          </p>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height
    }
  );
}
