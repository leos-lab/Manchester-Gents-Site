'use client';

import { useState } from 'react';
import styles from './page.module.css';

// Ask to join the app beta. An admin approves it in the app, which emails the
// install steps for the chosen phone.
export default function BetaRequestForm({ platform: initialPlatform = '', email: initialEmail = '', instagramHandle = '' }) {
  const [form, setForm] = useState({
    email: initialEmail,
    instagramHandle,
    platform: initialPlatform,
    message: '',
    website: ''
  });
  const [state, setState] = useState({ busy: false, error: '', done: null });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: '', done: null });
    try {
      const res = await fetch('/api/beta-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      setState({ busy: false, error: '', done: data.status || 'PENDING' });
    } catch (error) {
      setState({ busy: false, error: error.message, done: null });
    }
  };

  if (state.done) {
    return (
      <div className={styles.formDone} role="status">
        <h3>{state.done === 'APPROVED' ? 'You’re already in' : 'Request sent'}</h3>
        <p>
          {state.done === 'APPROVED'
            ? `We’ve already emailed the install steps to ${form.email}. Check your spam folder if you can’t find them.`
            : `Thanks! We’ll email ${form.email} with how to install the app once your request is approved.`}
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <fieldset className={styles.platformChoice}>
        <legend>Your phone</legend>
        {[
          ['IOS', 'iPhone'],
          ['ANDROID', 'Android']
        ].map(([value, label]) => (
          <label key={value} className={form.platform === value ? styles.chosen : undefined}>
            <input type="radio" name="platform" value={value} checked={form.platform === value} onChange={set('platform')} required />
            {label}
          </label>
        ))}
      </fieldset>
      <label>
        <span>Email address</span>
        <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        <small>
          {form.platform === 'ANDROID'
            ? 'Use the Google account you use for the Play Store.'
            : form.platform === 'IOS'
              ? 'We’ll send your TestFlight invite here.'
              : 'We’ll send the install steps here.'}
        </small>
      </label>
      <label>
        <span>Instagram username</span>
        <input value={form.instagramHandle} onChange={set('instagramHandle')} placeholder="@yourname" autoCapitalize="none" autoCorrect="off" required />
      </label>
      <label>
        <span>A message for Leo (optional)</span>
        <textarea value={form.message} onChange={set('message')} rows={3} maxLength={1000} placeholder="Anything you’d like to say or ask" />
      </label>
      {/* Honeypot: hidden from people, bots fill it in. */}
      <input className={styles.hp} tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} aria-hidden="true" />
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={styles.primary} disabled={state.busy}>
        {state.busy ? 'Sending…' : 'Request to join the beta'}
      </button>
    </form>
  );
}
