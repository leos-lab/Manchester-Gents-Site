import fs from 'fs';
import path from 'path';

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
  } catch {
    return DEFAULT_PRIMARY_URL;
  }
}

const appUrlList = parseAppUrlList(process.env.NEXT_PUBLIC_APP_URL);
const validAppUrl = pickPrimaryAppUrl(appUrlList);

const PUBLIC_LOGO_URL = `${validAppUrl}/images/Horizontal%20Logo.svg`;
const LOGO_PATH = path.join(process.cwd(), 'public/images/Horizontal Logo.svg');
let cachedLogoDataUrl;

export function getOgLogoDataUrl() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  try {
    const logo = fs.readFileSync(LOGO_PATH);
    cachedLogoDataUrl = `data:image/svg+xml;base64,${logo.toString('base64')}`;
    return cachedLogoDataUrl;
  } catch (err) {
    console.warn('OG logo embed failed, falling back to public logo URL.', err);
  }

  return PUBLIC_LOGO_URL;
}

export async function fetchOgImageArrayBuffer(imageUrl) {
  if (!imageUrl) return null;

  let url;
  try {
    url = new URL(imageUrl);
  } catch (err) {
    console.warn('Ignoring invalid OG image URL.', err);
    return null;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url.toString(), {
      cache: 'no-store',
      signal: controller.signal
    });
    if (!res.ok) {
      console.warn('OG image fetch failed:', { status: res.status, url: url.origin });
      return null;
    }
    return await res.arrayBuffer();
  } catch (err) {
    console.warn('OG image buffer fetch failed:', err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
