import { getPinstripeEventSlug, PINSTRIPE_SITE_SLUG } from './pinstripe';

// A few photos from an event's Pinstripe gallery (members-only surfaces).
export async function getGalleryHighlights(event, limit = 8) {
  const apiBase = (process.env.NEXT_PUBLIC_PINSTRIPE_API_URL || '').replace(/\/+$/, '');
  if (!apiBase || !event) return [];
  const params = new URLSearchParams({ status: 'uploaded', page: '1', limit: String(limit) });
  try {
    const res = await fetch(
      `${apiBase}/api/sites/${encodeURIComponent(PINSTRIPE_SITE_SLUG)}/events/${encodeURIComponent(getPinstripeEventSlug(event))}/photos?${params}`,
      { next: { revalidate: 300 } }
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return [];
    return (json.data?.photos || [])
      .map((p) => {
        const a = p.assets?.[0] || {};
        return { id: String(p.id), src: a.mediumUrl || a.displayUrl || a.url, width: p.width, height: p.height };
      })
      .filter((p) => p.src);
  } catch {
    return [];
  }
}
