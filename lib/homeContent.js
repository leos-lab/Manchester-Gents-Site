import prisma from './prisma';

// What admins choose for the home page (Admin → Home page), stored as JSON in
// GlobalSetting. Photos are { id, src, srcSet } from Pinstripe event galleries;
// choosing one here is what makes it public (galleries are members-only).
const KEY = 'homeContent';

export const HOME_CONTENT_DEFAULTS = {
  heroCaption: 'From our last social',
  headline: 'Manchester Gents',
  lede: 'Relaxed socials at The Lodge for gents who like to dress well. Suits on, good drinks, easy conversation.',
  heroPhoto: null,
  showcase: [],
  // App download links on the home page (TestFlight / Play testing for UAT,
  // the App Store / Google Play for launch). A button shows once its link is set.
  iosAppUrl: '',
  androidAppUrl: '',
  // "How an evening goes": photo (else the latest event cover) and words.
  eveningPhoto: null,
  eveningTitle: 'How an evening goes',
  eveningIntro:
    'We meet at The Lodge in Manchester. Dress sharp, grab a drink, and talk with gents who care about good tailoring as much as you do.',
  eveningPoints: [
    { title: 'Unscripted', text: 'No presentations and no agenda, just relaxed conversation in well-dressed company.' },
    { title: 'Familiar faces', text: 'Meet the people you know from Instagram, and new gents who share your taste.' },
    { title: 'Optional nightcaps', text: 'Stay for the full two hours, or carry on downstairs at The Eagle afterwards.' }
  ]
};

export async function getHomeContent() {
  const row = await prisma.globalSetting.findUnique({ where: { key: KEY } }).catch(() => null);
  let saved = {};
  try {
    saved = row?.value ? JSON.parse(row.value) : {};
  } catch {
    saved = {};
  }
  return { ...HOME_CONTENT_DEFAULTS, ...saved };
}

export async function saveHomeContent(content) {
  const value = JSON.stringify(content);
  await prisma.globalSetting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  return getHomeContent();
}

// A Pinstripe gallery photo's asset as the home page shows it: the 1080px
// image with the 2048px one in srcSet.
export function photoForHome(photo) {
  const a = photo.assets?.[0] || {};
  const local = a.provider === 'local';
  const src = local ? a.mediumUrl : a.mediumUrl || a.displayUrl || a.url;
  const srcSet = local && a.displayUrl ? `${a.mediumUrl} 1080w, ${a.displayUrl} 2048w` : undefined;
  return { id: String(photo.id), src, srcSet, width: photo.width || null, height: photo.height || null };
}
