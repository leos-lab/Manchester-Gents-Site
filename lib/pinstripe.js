export const PINSTRIPE_SITE_SLUG = process.env.NEXT_PUBLIC_PINSTRIPE_SITE_SLUG || 'manchestergents';

// An event's Pinstripe gallery slug: taken from galleryUrl (/event/<slug>) when
// set, otherwise the event's own slug. Shared by the website and the app API.
export function getPinstripeEventSlug(event) {
  if (!event.galleryUrl) return event.slug;
  try {
    const [, routeType, routeSlug] = new URL(event.galleryUrl).pathname.split('/');
    if (routeType === 'event' && routeSlug) return decodeURIComponent(routeSlug);
  } catch {
    // Not a URL: fall back to the event slug.
  }
  return event.slug;
}

// An event's admin-only "Event assets" gallery (cover photos, promo material):
// its own Pinstripe gallery, so nothing in it appears in the members' gallery.
export function getPinstripeAssetsSlug(event) {
  return `${getPinstripeEventSlug(event)}-assets`;
}
