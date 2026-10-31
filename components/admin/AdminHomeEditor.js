'use client';

import { useState } from 'react';
import PhotoPicker from './PhotoPicker';
import styles from './AdminHomeEditor.module.css';

const strip = ({ thumb, ...photo }) => photo;

// Admin → Home page: the hero photo and its text, and the photos that scroll
// past for visitors who aren't signed in. Choosing a photo here makes it
// public on the home page (galleries themselves stay members-only).
export default function AdminHomeEditor({ initial, events, apiBase, siteSlug }) {
  const [content, setContent] = useState(initial);
  const [status, setStatus] = useState(null);
  const set = (key) => (e) => setContent((c) => ({ ...c, [key]: e.target.value }));
  const inShowcase = (id) => content.showcase.some((p) => p.id === id);

  const toggleShowcase = (photo) =>
    setContent((c) => ({
      ...c,
      showcase: inShowcase(photo.id) ? c.showcase.filter((p) => p.id !== photo.id) : [...c.showcase, strip(photo)]
    }));

  const move = (index, by) =>
    setContent((c) => {
      const list = [...c.showcase];
      const [item] = list.splice(index, 1);
      list.splice(Math.max(0, Math.min(list.length, index + by)), 0, item);
      return { ...c, showcase: list };
    });

  const save = async () => {
    setStatus('Saving…');
    try {
      const res = await fetch('/api/admin/home-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Couldn’t save.');
      setContent(json.content);
      setStatus('Saved. The home page is updated.');
    } catch (e) {
      setStatus(e.message);
    }
  };

  return (
    <div className={styles.editor}>
      <section className={styles.panel}>
        <h2>Hero</h2>
        <div className={styles.heroPreview}>
          {content.heroPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.heroPhoto.src} alt="" />
          ) : (
            <p>No photo chosen: the latest event cover is used. Pick one below with “Use as hero”.</p>
          )}
          {content.heroPhoto ? (
            <button type="button" onClick={() => setContent((c) => ({ ...c, heroPhoto: null }))}>
              Remove hero photo
            </button>
          ) : null}
        </div>
        <label>
          <span>Caption on the photo (leave empty for none)</span>
          <input value={content.heroCaption} onChange={set('heroCaption')} maxLength={80} placeholder="From our last social" />
        </label>
        <label>
          <span>Headline</span>
          <input value={content.headline} onChange={set('headline')} maxLength={60} />
        </label>
        <label>
          <span>Intro</span>
          <textarea value={content.lede} onChange={set('lede')} maxLength={300} rows={3} />
        </label>
      </section>

      <section className={styles.panel}>
        <h2>App downloads</h2>
        <p className={styles.hint}>
          Buttons on the home page. Use TestFlight and Google Play testing links for UAT, then the App Store and Google
          Play links at launch. Leave a link empty to hide its button.
        </p>
        <label>
          <span>iPhone (App Store or TestFlight link)</span>
          <input value={content.iosAppUrl} onChange={set('iosAppUrl')} placeholder="https://testflight.apple.com/join/…" inputMode="url" />
        </label>
        <label>
          <span>Android (Google Play or testing link)</span>
          <input value={content.androidAppUrl} onChange={set('androidAppUrl')} placeholder="https://play.google.com/…" inputMode="url" />
        </label>
      </section>

      <section className={styles.panel}>
        <h2>Scrolling photos</h2>
        <p className={styles.hint}>Shown to visitors who aren’t signed in, slowly scrolling under the hero. Add them below.</p>
        {content.showcase.length ? (
          <ol className={styles.showcase}>
            {content.showcase.map((p, i) => (
              <li key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt="" />
                <div>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>
                    Earlier
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === content.showcase.length - 1}>
                    Later
                  </button>
                  <button type="button" onClick={() => toggleShowcase(p)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.hint}>None yet: the strip is hidden.</p>
        )}
      </section>

      <section className={styles.panel}>
        <h2>Choose photos</h2>
        <PhotoPicker
          events={events}
          apiBase={apiBase}
          siteSlug={siteSlug}
          renderPhoto={(photo) => (
            <>
              <button
                type="button"
                aria-pressed={content.heroPhoto?.id === photo.id}
                onClick={() => setContent((c) => ({ ...c, heroPhoto: strip(photo) }))}
              >
                Use as hero
              </button>
              <button type="button" aria-pressed={inShowcase(photo.id)} onClick={() => toggleShowcase(photo)}>
                {inShowcase(photo.id) ? 'Scrolling' : 'Add to scroll'}
              </button>
            </>
          )}
        />
      </section>

      <div className={styles.saveBar}>
        <button type="button" className={styles.save} onClick={save}>
          Save home page
        </button>
        {status ? <span role="status">{status}</span> : null}
      </div>
    </div>
  );
}
