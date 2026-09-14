import './globals.css';
import Providers from '@/components/Providers';
import localFont from 'next/font/local';
import { Inter } from 'next/font/google';

const DEFAULT_PRIMARY_URL = 'https://manchestergents.com';
const LOCAL_FALLBACK_URL = 'http://localhost:3000';

function parseAppUrlList(raw) {
  const entries = (raw || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  if (entries.length === 0) return [LOCAL_FALLBACK_URL];

  const validOrigins = [];
  for (const entry of entries) {
    try {
      validOrigins.push(new URL(entry).origin);
    } catch (err) {
      console.warn(`Ignoring invalid NEXT_PUBLIC_APP_URL entry: ${entry}`, err);
    }
  }
  return validOrigins.length ? validOrigins : [LOCAL_FALLBACK_URL];
}

function pickPrimaryAppUrl(urls) {
  const preferred = urls.find((url) => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      return host === 'manchestergents.com';
    } catch {
      return false;
    }
  });
  const candidate = preferred || urls[0] || DEFAULT_PRIMARY_URL;
  try {
    return new URL(candidate).origin;
  } catch (err) {
    console.warn('Invalid primary NEXT_PUBLIC_APP_URL, falling back to default.', err);
    return DEFAULT_PRIMARY_URL;
  }
}

const appUrlList = parseAppUrlList(process.env.NEXT_PUBLIC_APP_URL);
const APP_URL = pickPrimaryAppUrl(appUrlList);

const headingFont = localFont({
  src: '../public/fonts/Thelorin.otf',
  variable: '--font-heading',
  display: 'swap'
});

const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap'
});

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: 'Manchester Gents',
  description:
    'Relaxed socials for suited gents at The Lodge in Manchester — drinks, conversation, and effortless style.',
  openGraph: {
    title: 'Manchester Gents',
    description:
      'Relaxed socials for suited gents at The Lodge in Manchester — drinks, conversation, and effortless style.',
    url: APP_URL,
    siteName: 'Manchester Gents',
    type: 'website',
    locale: 'en_GB',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Manchester Gents'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manchester Gents',
    description:
      'Relaxed socials for suited gents at The Lodge in Manchester — drinks, conversation, and effortless style.',
    images: ['/opengraph-image']
  },
  icons: {
    icon: [
      { url: '/icons/favicon.ico', type: 'image/x-icon' }
    ],
    shortcut: [
      { url: '/icons/favicon.ico', type: 'image/x-icon' }
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png' },
      { url: '/icons/apple-touch-icon-57x57.png', sizes: '57x57' },
      { url: '/icons/apple-touch-icon-72x72.png', sizes: '72x72' },
      { url: '/icons/apple-touch-icon-76x76.png', sizes: '76x76' },
      { url: '/icons/apple-touch-icon-114x114.png', sizes: '114x114' },
      { url: '/icons/apple-touch-icon-120x120.png', sizes: '120x120' },
      { url: '/icons/apple-touch-icon-144x144.png', sizes: '144x144' },
      { url: '/icons/apple-touch-icon-152x152.png', sizes: '152x152' },
      { url: '/icons/apple-touch-icon-180x180.png', sizes: '180x180' }
    ]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
