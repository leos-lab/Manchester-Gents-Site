import { getPinstripeEventSlug, PINSTRIPE_SITE_SLUG } from './pinstripe';
import { photoForHome } from './homeContent';

// Photos from an event's Pinstripe gallery (members-only surfaces). Photos an
// admin featured (event.featuredPhotoIds, in their order) come first, then
// the latest uploads.
export async function getGalleryHighlights(event, limit = 8) {
  const apiBase = (process.env.NEXT_PUBLIC_PINSTRIPE_API_URL || '').replace(/\/+$/, '');
  if (!apiBase || !event) return [];
  const featured = event.featuredPhotoIds || [];
  const params = new URLSearchParams({ status: 'uploaded', page: '1', limit: String(featured.length ? 100 : limit) });
  try {
    const res = await fetch(
      `${apiBase}/api/sites/${encodeURIComponent(PINSTRIPE_SITE_SLUG)}/events/${encodeURIComponent(getPinstripeEventSlug(event))}/photos?${params}`,
      { next: { revalidate: 300 } }
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return [];
    const photos = (json.data?.photos || []).map(photoForHome).filter((p) => p.src);
    const rank = (p) => {
      const i = featured.indexOf(p.id);
      return i === -1 ? featured.length : i;
    };
    return photos.sort((a, b) => rank(a) - rank(b)).slice(0, limit);
  } catch {
    return [];
  }
}
