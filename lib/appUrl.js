const DEFAULT_BASE_URL = 'http://localhost:3000';

function pickFirstUrl(rawUrl) {
  const candidates = (rawUrl || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  return candidates[0] || DEFAULT_BASE_URL;
}

export function getBaseUrl() {
  const raw =
    process.env.MCR_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_BASE_URL;
  const candidate = pickFirstUrl(raw);
  try {
    return new URL(candidate).origin;
  } catch (error) {
    console.warn('Invalid base URL provided; falling back to localhost.', error);
    return DEFAULT_BASE_URL;
  }
}
