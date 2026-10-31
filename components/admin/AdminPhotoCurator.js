'use client';

import { useState } from 'react';
import PhotoPicker from './PhotoPicker';

// Admin → Photos: star the photos to show first for an event (home page mosaic
// and event page, in the order starred), or hide a photo from the gallery.
// Changes save straight away.
export default function AdminPhotoCurator({ events, apiBase, siteSlug }) {
  const [featured, setFeatured] = useState(() => Object.fromEntries(events.map((e) => [e.id, e.featuredPhotoIds])));
  const [eventId, setEventId] = useState(events[0]?.id);
  const [hidden, setHidden] = useState(() => new Set());
  const [status, setStatus] = useState(null);
  const ids = featured[eventId] || [];

  const saveFeatured = async (next) => {
    setFeatured((f) => ({ ...f, [eventId]: next }));
    setStatus('Saving…');
    const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/featured-photos`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIds: next })
    }).catch(() => null);
    setStatus(res?.ok ? 'Saved.' : 'Couldn’t save. Try again.');
  };

  const hide = async (photo) => {
    if (!window.confirm('Hide this photo? It’s removed from the gallery for everyone.')) return;
    const res = await fetch(`/api/admin/photos/${encodeURIComponent(photo.id)}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) return setStatus('Couldn’t hide that photo.');
    setHidden((h) => new Set(h).add(photo.id));
    if (ids.includes(photo.id)) saveFeatured(ids.filter((id) => id !== photo.id));
    setStatus('Photo hidden.');
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <p style={{ margin: 0, color: 'rgba(247, 244, 237, 0.66)' }}>
        {ids.length ? `${ids.length} featured for this event, shown first in the order you starred them.` : 'No featured photos: the latest uploads are shown.'}
        {status ? ` ${status}` : ''}
      </p>
      <PhotoPicker
        events={events}
        apiBase={apiBase}
        siteSlug={siteSlug}
        eventId={eventId}
        onEventChange={(id) => {
          setEventId(id);
          setStatus(null);
        }}
        renderPhoto={(photo) =>
          hidden.has(photo.id) ? (
            <button type="button" disabled>
              Hidden
            </button>
          ) : (
            <>
              <button
                type="button"
                aria-pressed={ids.includes(photo.id)}
                onClick={() => saveFeatured(ids.includes(photo.id) ? ids.filter((id) => id !== photo.id) : [...ids, photo.id])}
              >
                {ids.includes(photo.id) ? `★ Featured ${ids.indexOf(photo.id) + 1}` : '☆ Feature'}
              </button>
              <button type="button" className="danger" onClick={() => hide(photo)}>
                Hide
              </button>
            </>
          )
        }
      />
    </div>
  );
}
