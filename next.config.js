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
        console.warn(`Ignoring invalid NEXTAUTH_URL entry: ${url}`, err);
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

const parsedOrigins = parseDomainList(process.env.NEXTAUTH_URL);
const primaryOrigin = pickPrimary(parsedOrigins.length ? parsedOrigins : [LOCAL_FALLBACK_URL]);
const allowedOriginsEnv = Array.from(new Set([primaryOrigin, ...(parsedOrigins.length ? parsedOrigins : [LOCAL_FALLBACK_URL])])); // dedupe with preferred first

// Ensure NextAuth sees a single canonical host (helps when NEXTAUTH_URL is comma-separated)
process.env.NEXTAUTH_URL = primaryOrigin;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Support multiple domains for NextAuth/Server Actions (comma-separated)
      allowedOrigins: allowedOriginsEnv
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  }
};

module.exports = nextConfig;
