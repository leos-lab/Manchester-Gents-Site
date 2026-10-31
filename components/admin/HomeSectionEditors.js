'use client';

import { useState } from 'react';
import PhotoPicker from './PhotoPicker';
import FocusPicker from './FocusPicker';
import styles from './AdminHomeEditor.module.css';

// Fields for each editable section of the home page (opened from its Edit
// button in admin mode). `content` is the whole homeContent setting.
const strip = ({ thumb, ...photo }) => photo;

export function HeroFields({ content, setContent, picker }) {
  const set = (key) => (e) => setContent((c) => ({ ...c, [key]: e.target.value }));
  return (
    <>
      <div className={styles.heroPreview}>
        {content.heroPhoto ? (
          <FocusPicker photo={content.heroPhoto} onChange={(focus) => setContent((c) => ({ ...c, heroPhoto: { ...c.heroPhoto, focus } }))} />
        ) : (
          <p>No photo chosen: the latest event cover is used. Pick one below.</p>
        )}
        {content.heroPhoto ? (
          <button type="button" onClick={() => setContent((c) => ({ ...c, heroPhoto: null }))}>
            Remove photo
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
      <PhotoPicker
        {...picker}
        renderPhoto={(photo) => (
          <button
            type="button"
            aria-pressed={content.heroPhoto?.id === photo.id}
            onClick={() => setContent((c) => ({ ...c, heroPhoto: strip(photo) }))}
          >
            {content.heroPhoto?.id === photo.id ? 'Hero photo' : 'Use as hero'}
          </button>
        )}
      />
    </>
  );
}

export function AppFields({ content, setContent }) {
  const set = (key) => (e) => setContent((c) => ({ ...c, [key]: e.target.value }));
  return (
    <>
      <p className={styles.hint}>
        TestFlight and Google Play testing links for UAT; the App Store and Google Play links at launch. Leave a link empty
        to hide its button.
      </p>
      <label>
        <span>iPhone (App Store or TestFlight link)</span>
        <input value={content.iosAppUrl} onChange={set('iosAppUrl')} placeholder="https://testflight.apple.com/join/…" inputMode="url" />
      </label>
      <label>
        <span>Android (Google Play or testing link)</span>
        <input value={content.androidAppUrl} onChange={set('androidAppUrl')} placeholder="https://play.google.com/…" inputMode="url" />
      </label>
    </>
  );
}

export function ShowcaseFields({ content, setContent, picker }) {
  const [focusing, setFocusing] = useState(null); // photo id
  const inShowcase = (id) => content.showcase.some((p) => p.id === id);
  const toggle = (photo) =>
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
  return (
    <>
      <p className={styles.hint}>Everyone sees these scroll slowly past under the hero, in this order.</p>
      {focusing && content.showcase.some((p) => p.id === focusing) ? (
        <div className={styles.heroPreview}>
          <FocusPicker
            photo={content.showcase.find((p) => p.id === focusing)}
            onChange={(focus) =>
              setContent((c) => ({ ...c, showcase: c.showcase.map((p) => (p.id === focusing ? { ...p, focus } : p)) }))
            }
          />
          <button type="button" onClick={() => setFocusing(null)}>
            Done
          </button>
        </div>
      ) : null}
      {content.showcase.length ? (
        <ol className={styles.showcase}>
          {content.showcase.map((p, i) => (
            <li key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" style={p.focus ? { objectPosition: `${p.focus.x}% ${p.focus.y}%` } : undefined} />
              <div>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>
                  Earlier
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === content.showcase.length - 1}>
                  Later
                </button>
                <button type="button" onClick={() => setFocusing(p.id)} aria-pressed={focusing === p.id}>
                  Focus
                </button>
                <button type="button" onClick={() => toggle(p)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.hint}>None yet: the strip is hidden.</p>
      )}
      <PhotoPicker
        {...picker}
        renderPhoto={(photo) => (
          <button type="button" aria-pressed={inShowcase(photo.id)} onClick={() => toggle(photo)}>
            {inShowcase(photo.id) ? 'Added' : 'Add'}
          </button>
        )}
      />
    </>
  );
}
