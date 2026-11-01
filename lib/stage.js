// Which copy of the site a host is: dev.manchestergents.com (and localhost)
// is "dev", uat.manchestergents.com is "uat", anything else is the live site.
// No Next.js imports, so middleware can use it too.
export function stageFromHost(host) {
  const name = (host || '').split(':')[0];
  if (name.startsWith('uat.')) return 'uat';
  if (name.startsWith('dev.') || name === 'localhost' || name === '127.0.0.1') return 'dev';
  return 'prod';
}

// The host a request came in on (Vercel sets x-forwarded-host).
export function requestHost(headers) {
  return headers.get('x-forwarded-host') || headers.get('host') || '';
}
