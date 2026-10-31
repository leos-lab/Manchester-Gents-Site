'use client';

import { useEffect, useState } from 'react';
import styles from './PhotoPicker.module.css';

// Browse an event's gallery (from Pinstripe) and act on photos. `events` are
// { id, title, gallerySlug }; renderPhoto(photo) returns the tile's controls.
// Photos are passed on as { id, src, srcSet, width, height } (see
// lib/homeContent.js photoForHome).
export default function PhotoPicker({ events, apiBase, siteSlug, eventId, onEventChange, renderPhoto }) {
  const [current, setCurrent] = useState(eventId || events[0]?.id || '');
  const [photos, setPhotos] = useState(null);
  const [error, setError] = useState(null);
  const event = events.find((e) => e.id === current);

  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    setPhotos(null);
    setError(null);
    fetch(
      `${apiBase}/api/sites/${encodeURIComponent(siteSlug)}/events/${encodeURIComponent(event.gallerySlug)}/photos?status=uploaded&page=1&limit=100`
    )
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json?.success) throw new Error(json?.error || 'Gallery unavailable.');
        setPhotos(
          (json.data?.photos || []).map((p) => {
            const a = p.assets?.[0] || {};
            const local = a.provider === 'local';
            return {
              id: String(p.id),
              src: local ? a.mediumUrl : a.mediumUrl || a.displayUrl || a.url,
              srcSet: local && a.displayUrl ? `${a.mediumUrl} 1080w, ${a.displayUrl} 2048w` : undefined,
              thumb: local ? a.thumbUrl : a.mediumUrl || a.url,
              width: p.width || null,
              height: p.height || null
            };
          })
        );
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [event, apiBase, siteSlug]);

  return (
    <div className={styles.picker}>
      <label className={styles.select}>
        <span>Event</span>
        <select
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            onEventChange?.(e.target.value);
          }}
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className={styles.note}>{error}</p> : null}
      {!photos && !error ? <p className={styles.note}>Loading photos…</p> : null}
      {photos && !photos.length ? <p className={styles.note}>No photos in this gallery yet.</p> : null}
      {photos?.length ? (
        <ul className={styles.grid}>
          {photos.map((photo) => (
            <li key={photo.id} className={styles.tile}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumb} alt="" loading="lazy" />
              <div className={styles.controls}>{renderPhoto(photo)}</div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
