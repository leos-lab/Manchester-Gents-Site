import { headers } from 'next/headers';
import { requestHost, stageFromHost } from './stage';

// Which copy of the site this request is on. Server components only.
export function getSiteStage() {
  return stageFromHost(requestHost(headers()));
}

// Dev and UAT run test builds of the app (TestFlight and Play testing), and
// only beta testers (and admins) can use the signed-in site there.
export function isTestSite() {
  return getSiteStage() !== 'prod';
}
