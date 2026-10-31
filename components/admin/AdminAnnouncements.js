'use client';

import { useEffect, useState } from 'react';
import styles from './AdminAnnouncements.module.css';

const AUDIENCES = [
  { key: 'ALL', label: 'All members', needsEvent: false, note: 'Also posted in the community chat.' },
  { key: 'GOING', label: 'Going to the event', needsEvent: true, note: 'Also posted in the event chat.' },
  { key: 'NOT_RSVPED', label: 'Haven’t RSVPed yet', needsEvent: true, note: 'Notification only, with a link to the event.' }
];
const AUDIENCE_LABEL = { ALL: 'All members', GOING: 'Going', NOT_RSVPED: 'Not RSVPed' };

// Admin → Announcements (as in the app): push an announcement to members,
// regarding an event or general news.
export default function AdminAnnouncements({ events }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventId, setEventId] = useState('');
  const [audience, setAudience] = useState('ALL');
  const [sent, setSent] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const event = events.find((e) => e.id === eventId);

  const load = () =>
    fetch('/api/v1/admin/announcements')
      .then((res) => res.json())
      .then((json) => setSent(json.announcements || []))
      .catch(() => setSent([]));
  useEffect(() => {
    load();
  }, []);

  const send = async (e) => {
    e.preventDefault();
    const who = audience === 'ALL' ? 'every member' : audience === 'GOING' ? `everyone going to ${event.title}` : `members who haven’t RSVPed to ${event.title}`;
    if (!window.confirm(`Send this announcement to ${who}?`)) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/v1/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), eventId: eventId || null, audience })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Couldn’t send.');
      setStatus(`Sent to ${json.recipients} ${json.recipients === 1 ? 'member' : 'members'} (${json.delivered} with the app).`);
      setTitle('');
      setBody('');
      load();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={send}>
        <label>
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Doors open at 7pm" required minLength={2} />
        </label>
        <label>
          <span>Message</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={4} required minLength={2} />
        </label>
        <label>
          <span>Regarding</span>
          <select
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              if (!e.target.value) setAudience('ALL');
            }}
          >
            <option value="">General</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Send to</legend>
          {AUDIENCES.map((a) => (
            <label key={a.key} className={styles.radio}>
              <input
                type="radio"
                name="audience"
                value={a.key}
                checked={audience === a.key}
                disabled={a.needsEvent && !eventId}
                onChange={() => setAudience(a.key)}
              />
              {a.label}
              {a.needsEvent && !eventId ? <small> (choose an event above)</small> : null}
            </label>
          ))}
          <p className={styles.note}>{AUDIENCES.find((a) => a.key === audience).note}</p>
        </fieldset>
        <button type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send announcement'}
        </button>
        {status ? <p role="status">{status}</p> : null}
      </form>

      <section>
        <h2>Sent</h2>
        {sent === null ? <p className={styles.note}>Loading…</p> : null}
        {sent?.length === 0 ? <p className={styles.note}>None yet.</p> : null}
        <ul className={styles.sent}>
          {sent?.map((a) => (
            <li key={a.id}>
              <strong>{a.title}</strong>
              <span>{a.body}</span>
              <small>
                {AUDIENCE_LABEL[a.audience] || a.audience}
                {a.event ? ` · ${a.event.title}` : ''} · {a.recipients} members ·{' '}
                {new Date(a.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                {a.createdBy ? ` · ${a.createdBy}` : ''}
              </small>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
