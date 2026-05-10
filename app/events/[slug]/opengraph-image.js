/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';
import { fetchOgImageArrayBuffer, getOgLogoDataUrl } from '@/lib/og';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params } = {}) {
  const logo = getOgLogoDataUrl();
  try {
    const slug = params?.slug;
    if (!slug) {
      throw new Error('Missing slug');
    }

    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        title: true,
        subtitle: true,
        startTime: true,
        location: true,
        coverImageUrl: true
      }
    });

    const title = event?.title || 'Manchester Gents Event';
    const subtitle = event?.subtitle || 'Club socials for well-dressed gents';
    const detail = event?.startTime
      ? `${format(new Date(event.startTime), 'EEEE d MMM yyyy')} • ${event.location || 'The Lodge, Manchester'}`
      : event?.location || 'Manchester, United Kingdom';

    const coverData = await fetchOgImageArrayBuffer(event?.coverImageUrl);

    return renderOgCard({ logo, title, subtitle, detail, coverData });
  } catch (error) {
    console.error('Event OpenGraph image error:', error);
    return renderOgCard({
      logo,
      title: 'Manchester Gents',
      subtitle: 'Club socials for well-dressed gents',
      detail: 'Manchester, United Kingdom'
    });
  }
}

function renderOgCard({ logo, title, subtitle, detail, coverData }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: 'linear-gradient(160deg, #102033 0%, #0b1523 55%, #20344e 100%)',
          color: '#f7f4ed',
          padding: '80px 120px',
          gap: 40,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {coverData && (
          <img
            src={coverData}
            alt=""
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              inset: 0,
              width: '1200px',
              height: '630px',
              objectFit: 'cover',
              opacity: 0.42
            }}
          />
        )}
        {coverData && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(8, 14, 24, 0.92) 0%, rgba(8, 14, 24, 0.72) 46%, rgba(8, 14, 24, 0.38) 100%)'
            }}
          />
        )}
        <img
          src={logo}
          alt="Manchester Gents"
          width={360}
          height={140}
          style={{ objectFit: 'contain', position: 'relative' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760, position: 'relative' }}>
          <span style={{ fontSize: 26, letterSpacing: 8, textTransform: 'uppercase', opacity: 0.7 }}>
            Manchester Gents Presents
          </span>
          <h1 style={{ fontSize: 68, margin: 0, lineHeight: 1.1 }}>{title}</h1>
          <p style={{ fontSize: 30, margin: 0, opacity: 0.85 }}>{subtitle}</p>
          <p style={{ fontSize: 26, margin: 0, opacity: 0.7 }}>{detail}</p>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height
    }
  );
}
