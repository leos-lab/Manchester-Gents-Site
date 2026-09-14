const DEFAULT_PRIMARY_URL = 'https://manchestergents.com';
const LOCAL_FALLBACK_URL = 'http://localhost:3000';

function parseDomainList(raw) {
  return (raw || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => {
      try {
        return new URL(url).origin;
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean);
}

function pickPrimary(urls) {
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

// NEXTAUTH_URL can be a comma-separated list of allowed domains (e.g. the Vercel
// preview domain plus the custom domain). next.config.js normalizes this to a
// single origin, but that only happens at build time — on Vercel's serverless
// runtime, each function invocation gets the raw, unnormalized value straight
// from the dashboard. Normalizing again here, at module load, fixes it at
// runtime too (this module is re-evaluated on every cold start).
export function normalizeNextAuthUrl() {
  const parsed = parseDomainList(process.env.NEXTAUTH_URL);
  const primary = pickPrimary(parsed.length ? parsed : [LOCAL_FALLBACK_URL]);
  process.env.NEXTAUTH_URL = primary;
  return primary;
}
