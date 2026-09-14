import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

function parseDateToMs(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

const FALLBACK_COMING_SOON_ENABLED = process.env.NEXT_PUBLIC_COMING_SOON !== 'false';
const FALLBACK_DISABLE_AT_MS = parseDateToMs(process.env.NEXT_PUBLIC_COMING_SOON_DISABLE_AT);

async function getComingSoonState(req) {
  const fallback = {
    enabled: FALLBACK_COMING_SOON_ENABLED,
    disableAtMs: FALLBACK_DISABLE_AT_MS
  };
  try {
    const statusUrl = req.nextUrl.clone();
    statusUrl.pathname = '/api/coming-soon';
    statusUrl.search = '';
    const res = await fetch(statusUrl.toString(), {
      cache: 'no-store',
      headers: { 'x-mg-internal': '1' }
    });
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
  const fallback = { enabled: true, updatedAtMs: null };
  try {
    const statusUrl = req.nextUrl.clone();
    statusUrl.pathname = '/api/photo-notice';
    statusUrl.search = '';
    const res = await fetch(statusUrl.toString(), {
      cache: 'no-store',
      headers: { 'x-mg-internal': '1' }
    });
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
    const versionUrl = req.nextUrl.clone();
    versionUrl.pathname = '/api/session-version';
    versionUrl.search = '';
    const versionRes = await fetch(versionUrl.toString(), {
      cache: 'no-store',
      headers: { 'x-mg-internal': '1' }
    });
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
