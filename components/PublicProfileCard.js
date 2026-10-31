'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './PublicProfileCard.module.css';

// What other members see (as in the app): a public profile photo, separate
// from the private reference photo, and a short bio.
export default function PublicProfileCard() {
  const [me, setMe] = useState(null);
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(null);
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  const load = () =>
    fetch('/api/v1/me')
      .then((res) => res.json())
      .then(({ me: data }) => {
        setMe(data);
        setBio(data?.bio || '');
      })
      .catch(() => setStatus('Couldn’t load your profile.'));
  useEffect(() => {
    load();
  }, []);

  const run = async (label, fn) => {
    setBusy(label);
    setStatus(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(null);
    }
  };

  const json = async (res) => {
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.success === false) throw new Error(data?.error || 'Something went wrong.');
    return data;
  };

  // Straight to Pinstripe with a short-lived upload token, then set it.
  const upload = (file) =>
    run('upload', async () => {
      const { upload: target } = await json(await fetch('/api/v1/me/avatar', { method: 'POST' }));
      const form = new FormData();
      form.append('kind', target.kind);
      form.append(target.field || 'file', file);
      const { data: photo } = await json(
        await fetch(target.url, { method: 'POST', headers: { Authorization: `Bearer ${target.token}` }, body: form })
      );
      await json(
        await fetch('/api/v1/me/avatar', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoId: photo.id }) })
      );
      if (fileRef.current) fileRef.current.value = '';
    });

  const fromReference = () => run('reference', async () => json(await fetch('/api/v1/me/avatar/from-reference', { method: 'POST' })));
  const remove = () => run('remove', async () => json(await fetch('/api/v1/me/avatar', { method: 'DELETE' })));
  const saveBio = (e) => {
    e.preventDefault();
    run('bio', async () =>
      json(await fetch('/api/v1/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio: bio.trim() || null }) }))
    ).then(() => setStatus('Bio saved.'));
  };

  if (!me) return status ? <p className={styles.status}>{status}</p> : null;

  return (
    <section className={`${styles.card} glass-panel`} aria-labelledby="public-profile">
      <div>
        <h2 id="public-profile">Your public profile</h2>
        <p className={styles.hint}>What other members see on your profile and next to your messages. Your reference photo stays private.</p>
      </div>
      <div className={styles.row}>
        {me.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.avatarUrl} alt="Your profile photo" className={styles.avatar} />
        ) : (
          <span className={`${styles.avatar} ${styles.empty}`} aria-hidden="true">
            No photo
          </span>
        )}
        <div className={styles.actions}>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>
            {busy === 'upload' ? 'Uploading…' : me.avatarUrl ? 'Upload a new photo' : 'Upload a photo'}
          </button>
          {me.referencePhotoUrl ? (
            <button type="button" onClick={fromReference} disabled={Boolean(busy)}>
              {busy === 'reference' ? 'Copying…' : 'Use my reference photo'}
            </button>
          ) : null}
          {me.avatarUrl ? (
            <button type="button" className={styles.quiet} onClick={remove} disabled={Boolean(busy)}>
              Remove photo
            </button>
          ) : null}
        </div>
      </div>
      <form className={styles.bio} onSubmit={saveBio}>
        <label htmlFor="bio">Bio</label>
        <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} placeholder="A line about you" />
        <div className={styles.bioFoot}>
          <span>{bio.length}/300</span>
          <button type="submit" disabled={Boolean(busy)}>
            Save bio
          </button>
        </div>
      </form>
      {status ? <p className={styles.status} role="status">{status}</p> : null}
    </section>
  );
}
