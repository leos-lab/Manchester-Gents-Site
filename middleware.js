import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

function parseDateToMs(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

// The middleware asks the site's own API routes for gate settings. On Vercel
// preview deployments with Deployment Protection, those requests are blocked
// unless they carry the visitor's Vercel sign-in cookie (or the automation
// bypass secret), so forward both.
function internalFetch(req, pathname) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  const headers = { 'x-mg-internal': '1' };
  const cookie = req.headers.get('cookie');
  if (cookie) headers.cookie = cookie;
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  return fetch(url.toString(), { cache: 'no-store', headers, redirect: 'manual' });
}

// If the settings can't be read on a preview deployment, don't gate: the
// coming-soon page reads the database directly and would bounce visitors
// straight back, causing a redirect loop. Production still fails closed.
const IS_PREVIEW = (process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV) === 'preview';

const FALLBACK_COMING_SOON_ENABLED = process.env.NEXT_PUBLIC_COMING_SOON !== 'false';
const FALLBACK_DISABLE_AT_MS = parseDateToMs(process.env.NEXT_PUBLIC_COMING_SOON_DISABLE_AT);

async function getComingSoonState(req) {
  const fallback = {
    enabled: IS_PREVIEW ? false : FALLBACK_COMING_SOON_ENABLED,
    disableAtMs: FALLBACK_DISABLE_AT_MS
  };
  try {
    const res = await internalFetch(req, '/api/coming-soon');
    if (!res.ok) {
      return fallback;
    }
    const data = await res.json();
    const disableAtMs = data?.disableAt ? parseDateToMs(data.disableAt) : null;
    return {
      enabled: typeof data?.enabled === 'boolean' ? data.enabled : fallback.enabled,
      disableAtMs: Number.isNaN(disableAtMs) ? fallback.disableAtMs : disableAtMs
    };
  } catch (error) {
    return fallback;
  }
}

async function getPhotoNoticeState(req) {
  const fallback = { enabled: !IS_PREVIEW, updatedAtMs: null };
  try {
    const res = await internalFetch(req, '/api/photo-notice');
    if (!res.ok) {
      return fallback;
    }
    const data = await res.json();
    return {
      enabled: typeof data?.enabled === 'boolean' ? data.enabled : fallback.enabled,
      updatedAtMs: data?.updatedAt ? parseDateToMs(data.updatedAt) : null
    };
  } catch (error) {
    return fallback;
  }
}

const STATIC_PUBLIC_PATH =
  /(^\/_next|^\/icons|^\/images|^\/fonts|^\/favicon\.ico$|^\/manifest\.json$|^\/site\.webmanifest$|^\/robots\.txt$|^\/sitemap\.xml$|\/opengraph-image$|\.[^/]+$)/;

// Paths middleware fetches internally (getComingSoonState/getPhotoNoticeState/session-version).
// These must bail out before any network call, or a request to one of them re-enters
// middleware, which fetches them again, recursing exponentially.
const INTERNAL_STATUS_PATH =
  /^\/api\/(auth|session-version|coming-soon|photo-notice)(\/|$)/;

export async function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;

  if (INTERNAL_STATUS_PATH.test(pathname) || STATIC_PUBLIC_PATH.test(pathname)) {
    return NextResponse.next();
  }

  const comingSoon = await getComingSoonState(req);
  const hasExpired =
    comingSoon.disableAtMs !== null && Date.now() >= comingSoon.disableAtMs;
  const comingSoonActive = comingSoon.enabled && !hasExpired;

  const isComingSoonPublicPath =
    pathname.startsWith('/coming-soon') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/session-version') ||
    pathname.startsWith('/api/coming-soon') ||
    STATIC_PUBLIC_PATH.test(pathname);

  let currentSessionVersion = null;
  try {
    const versionRes = await internalFetch(req, '/api/session-version');
    if (versionRes.ok) {
      const data = await versionRes.json();
      currentSessionVersion = data?.version || null;
    }
  } catch (error) {
    currentSessionVersion = null;
  }

  let token = null;
  if (process.env.NEXTAUTH_SECRET) {
    try {
      token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    } catch (error) {
      // Ignore malformed or stale auth cookies; treat as unauthenticated.
      token = null;
    }
  }

  const hasValidVersion =
    Boolean(token?.sessionVersion) &&
    Boolean(currentSessionVersion) &&
    token.sessionVersion === currentSessionVersion;
  const validToken = hasValidVersion ? token : null;

  const isAdmin = validToken?.role === 'ADMIN';

  if (comingSoonActive && !isComingSoonPublicPath) {
    const isAdminLoginPath = pathname.startsWith('/login') || pathname.startsWith('/register');

    if (isAdminLoginPath && (isAdmin || searchParams.has('admin'))) {
      return NextResponse.next();
    }

    if (!isAdmin) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/coming-soon';
      redirectUrl.search = '';
      if (searchParams.has('admin')) {
        redirectUrl.searchParams.set('admin', searchParams.get('admin') || '1');
      }
      return NextResponse.redirect(redirectUrl);
    }
  }

  const isPhotoNoticePublicPath =
    pathname.startsWith('/photo-notice') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/coming-soon') ||
    STATIC_PUBLIC_PATH.test(pathname);

  if (validToken && !isPhotoNoticePublicPath) {
    const photoNotice = await getPhotoNoticeState(req);
    if (photoNotice.enabled) {
      const agreedMs = parseDateToMs(validToken.photoNoticeAgreedAt);
      const needsAcknowledgment =
        !agreedMs || (photoNotice.updatedAtMs !== null && agreedMs < photoNotice.updatedAtMs);

      if (needsAcknowledgment) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/photo-notice';
        redirectUrl.search = '';
        redirectUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
