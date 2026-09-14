'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

function getInitialForm(event) {
  return {
    coverImageUrl: event?.coverImageUrl || '',
    photosOgTitle: event?.photosOgTitle || '',
    photosOgSubtitle: event?.photosOgSubtitle || '',
    photosOgDetail: event?.photosOgDetail || ''
  };
}

function cleanPayload(form) {
  return {
    coverImageUrl: form.coverImageUrl.trim() || null,
    photosOgTitle: form.photosOgTitle.trim() || null,
    photosOgSubtitle: form.photosOgSubtitle.trim() || null,
    photosOgDetail: form.photosOgDetail.trim() || null
  };
}

export default function OgPreviewClient({ events }) {
  const [eventList, setEventList] = useState(events);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [pageType, setPageType] = useState('photos');
  const selectedEvent = useMemo(
    () => eventList.find((event) => event.id === selectedEventId) || eventList[0] || null,
    [eventList, selectedEventId]
  );
  const [form, setForm] = useState(() => getInitialForm(events[0]));
  const [cacheKey, setCacheKey] = useState(Date.now());
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  function selectEvent(eventId) {
    const nextEvent = eventList.find((event) => event.id === eventId);
    setSelectedEventId(eventId);
    setForm(getInitialForm(nextEvent));
    setStatus(null);
    setCacheKey(Date.now());
  }

  function updateField(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  async function saveOgSettings(nextForm = form) {
    if (!selectedEvent) return;

    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(selectedEvent.id)}/og`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload(nextForm))
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || 'Unable to update OG settings.');
      }

      setEventList((current) =>
        current.map((event) => (event.id === selectedEvent.id ? { ...event, ...json.event } : event))
      );
      setForm(getInitialForm(json.event));
      setCacheKey(Date.now());
      setStatus({ type: 'success', message: 'OG settings updated.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to update OG settings.' });
    } finally {
      setSaving(false);
    }
  }

  function useStandardBackground() {
    const nextForm = { ...form, coverImageUrl: '' };
    setForm(nextForm);
    saveOgSettings(nextForm);
  }

  if (!selectedEvent) {
    return <section className={`${styles.panel} glass-panel`}>No events available.</section>;
  }

  const eventPageUrl = `/events/${selectedEvent.slug}`;
  const photosPageUrl = `/events/${selectedEvent.slug}/photos`;
  const previewPageUrl = pageType === 'event' ? eventPageUrl : photosPageUrl;
  const previewImageUrl =
    pageType === 'event'
      ? `/opengraph-image?v=${cacheKey}`
      : `/events/${selectedEvent.slug}/opengraph-image?v=${cacheKey}`;
  const previewTitle =
    pageType === 'event'
      ? `${selectedEvent.title} | Manchester Gents`
      : form.photosOgTitle.trim() || selectedEvent.title;
  const previewSubtitle =
    pageType === 'event'
      ? 'Standard Manchester Gents OG'
      : form.photosOgSubtitle.trim() || selectedEvent.subtitle || 'Club socials for well-dressed gents';
  const previewDetail =
    pageType === 'event'
      ? eventPageUrl
      : form.photosOgDetail.trim() || selectedEvent.defaultDetail || photosPageUrl;

  return (
    <section className={styles.workspace}>
      <div className={`${styles.controlsPanel} glass-panel`}>
        <div className={styles.fieldGroup}>
          <label htmlFor="event-select">Event</label>
          <select id="event-select" value={selectedEvent.id} onChange={(event) => selectEvent(event.target.value)}>
            {eventList.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.segmented} aria-label="Preview page type">
          <button
            type="button"
            className={pageType === 'event' ? styles.segmentActive : ''}
            onClick={() => setPageType('event')}
          >
            Event page
          </button>
          <button
            type="button"
            className={pageType === 'photos' ? styles.segmentActive : ''}
            onClick={() => setPageType('photos')}
          >
            Photos page
          </button>
        </div>

        {pageType === 'photos' ? (
          <div className={styles.formStack}>
            <div className={styles.fieldGroup}>
              <label htmlFor="og-title">Photo OG title</label>
              <input
                id="og-title"
                type="text"
                maxLength={90}
                value={form.photosOgTitle}
                onChange={updateField('photosOgTitle')}
                placeholder={selectedEvent.title}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="og-subtitle">Photo OG subtitle</label>
              <input
                id="og-subtitle"
                type="text"
                maxLength={160}
                value={form.photosOgSubtitle}
                onChange={updateField('photosOgSubtitle')}
                placeholder={selectedEvent.subtitle || 'Club socials for well-dressed gents'}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="og-detail">Photo OG detail</label>
              <input
                id="og-detail"
                type="text"
                maxLength={120}
                value={form.photosOgDetail}
                onChange={updateField('photosOgDetail')}
                placeholder={selectedEvent.defaultDetail}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="og-background">Background image URL</label>
              <input
                id="og-background"
                type="url"
                value={form.coverImageUrl}
                onChange={updateField('coverImageUrl')}
                placeholder="Medium ImgBB URL"
              />
              <p>Use the medium ImgBB URL where possible. Empty means standard background.</p>
            </div>
            <div className={styles.buttonRow}>
              <button type="button" className={styles.primaryButton} onClick={() => saveOgSettings()} disabled={saving}>
                {saving ? 'Saving...' : 'Save photos OG'}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={useStandardBackground} disabled={saving}>
                Use standard background
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.standardNotice}>
            <span>Standard OG</span>
            <p>Event pages use the main Manchester Gents card. Photo backgrounds are only used on the photos page.</p>
          </div>
        )}

        {status && (
          <p className={`${styles.status} ${status.type === 'success' ? styles.statusSuccess : styles.statusError}`}>
            {status.message}
          </p>
        )}
      </div>

      <div className={`${styles.previewPanel} glass-panel`}>
        <div className={styles.previewTop}>
          <div>
            <span className="heading-font">{pageType === 'event' ? 'Event OG' : 'Photos OG'}</span>
            <p>{previewPageUrl}</p>
          </div>
          <div className={styles.previewLinks}>
            <Link href={previewPageUrl} target="_blank">
              Open page
            </Link>
            <Link href={previewImageUrl} target="_blank">
              Open image
            </Link>
          </div>
        </div>
        <div className={styles.previewImageFrame}>
          <Image
            src={previewImageUrl}
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 760px"
            className={styles.previewImage}
            unoptimized
          />
        </div>
        <div className={styles.previewMeta}>
          <h2>{previewTitle}</h2>
          <p>{previewSubtitle}</p>
          <span>{previewDetail}</span>
        </div>
      </div>
    </section>
  );
}
