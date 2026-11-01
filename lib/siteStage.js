import { headers } from 'next/headers';

// Which copy of the site this request is on, from the address it came in on:
// dev.manchestergents.com (and localhost) is "dev", uat.manchestergents.com is
// "uat", anything else is the live site. Server components only.
export function getSiteStage() {
  const host = (headers().get('x-forwarded-host') || headers().get('host') || '').split(':')[0];
  if (host.startsWith('uat.')) return 'uat';
  if (host.startsWith('dev.') || host === 'localhost' || host === '127.0.0.1') return 'dev';
  return 'prod';
}

// Dev and UAT run test builds of the app (TestFlight and Play testing).
export function isTestSite() {
  return getSiteStage() !== 'prod';
}
