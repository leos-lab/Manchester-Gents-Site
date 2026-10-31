'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './ChatApp.module.css';

// Member search for picking people (group chats).
function MemberPicker({ picked, setPicked, exclude = [] }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      fetch(`/api/v1/members?q=${encodeURIComponent(q.trim())}`)
        .then((res) => res.json())
        .then((json) => setResults(json.members || []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  const toggle = (m) =>
    setPicked((current) => {
      const next = new Map(current);
      if (next.has(m.id)) next.delete(m.id);
      else next.set(m.id, m);
      return next;
    });
  return (
    <div className={styles.picker}>
      {picked.size ? <p className={styles.pickedList}>{[...picked.values()].map((m) => m.name).join(', ')}</p> : null}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members by name or @instagram" aria-label="Search members" />
      <ul>
        {results
          .filter((m) => !exclude.includes(m.id))
          .map((m) => (
            <li key={m.id}>
              <button type="button" aria-pressed={picked.has(m.id)} onClick={() => toggle(m)}>
                <span>{m.name}</span>
                <span>{picked.has(m.id) ? 'Added' : 'Add'}</span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}

// New chat: search for a member to message, or start a group (like the app).
export function NewChatPanel({ Avatar, onPick, onNewGroup, onClose }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (q.trim().replace(/^@/, '').length < 2) {
      setResults([]);
      return undefined;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/v1/members?q=${encodeURIComponent(q.trim())}`)
        .then((res) => res.json())
        .then((json) => setResults(json.members || []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className={styles.panel}>
      <header className={styles.panelHead}>
        <h2>New chat</h2>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </header>
      <input
        className={styles.newChatSearch}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or @instagram"
        aria-label="Search members"
        autoFocus
      />
      <ul className={styles.newChatList}>
        <li>
          <button type="button" onClick={onNewGroup}>
            <span className={styles.newGroupIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <circle cx="9" cy="8" r="3.5" />
                <path d="M2 19c0-3.6 3.1-6 7-6s7 2.4 7 6v1H2z" />
                <circle cx="17" cy="9" r="2.8" />
                <path d="M17.5 13.2c2.8.3 4.5 2.4 4.5 5V20h-4.4v-1c0-2.3-.8-4.3-2.3-5.6.7-.2 1.4-.2 2.2-.2z" />
              </svg>
            </span>
            <span>New group</span>
          </button>
        </li>
        {results.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => onPick(m)}>
              <Avatar name={m.name} src={m.avatarUrl} size={40} />
              <span>
                {m.name}
                {m.instagram ? <small>@{m.instagram.handle}</small> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {q.trim().length >= 2 && !searching && !results.length ? <p className={styles.newChatHint}>No members found.</p> : null}
      {q.trim().length < 2 ? <p className={styles.newChatHint}>Type a name to find someone to message.</p> : null}
    </div>
  );
}

// New group chat: a name, optionally the event it's about, and people.
export function NewGroupPanel({ client, onCreated, onClose }) {
  const [title, setTitle] = useState('');
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [picked, setPicked] = useState(new Map());
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all(['upcoming', 'past'].map((scope) => fetch(`/api/v1/events?scope=${scope}`).then((r) => r.json()).catch(() => ({ events: [] })))).then(
      ([up, past]) => setEvents([...(up.events || []), ...(past.events || []).slice(0, 3)])
    );
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const reply = await client.request('create_group', { title: title.trim(), userIds: [...picked.keys()], eventId: eventId || null });
      onCreated(reply);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className={styles.panel} onSubmit={create}>
      <header className={styles.panelHead}>
        <h2>New group</h2>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </header>
      <label>
        <span>Group name</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} required autoFocus />
      </label>
      <label>
        <span>About an event (optional)</span>
        <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">General</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
      </label>
      <span className={styles.fieldLabel}>People</span>
      <MemberPicker picked={picked} setPicked={setPicked} exclude={[]} />
      {error ? <p className={styles.panelError}>{error}</p> : null}
      <button type="submit" className={styles.primaryButton} disabled={busy || !title.trim() || !picked.size}>
        {busy ? 'Creating…' : 'Create group'}
      </button>
    </form>
  );
}

// A chat's details and who's in it. Group admins manage the picture, name,
// admins and members; site admins manage the community and event chats.
export function ChatInfoPanel({ client, room, me, onClose, onLeft }) {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState(room.title || '');
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState(new Map());
  const [error, setError] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(room.photoUrl || null);
  const fileRef = useRef(null);
  const isGroup = room.kind === 'GROUP';

  const load = () =>
    client
      .request('group_members', { roomId: room.roomId })
      .then((reply) => setMembers(reply.members))
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.roomId]);

  const act = async (fn) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const uploadPhoto = (file) =>
    act(async () => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/v1/chat/rooms/${encodeURIComponent(room.roomId)}/photo`, { method: 'POST', body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Couldn’t change the picture.');
      setPhotoUrl(json.photoUrl);
    });

  const removePhoto = () =>
    act(async () => {
      const res = await fetch(`/api/v1/chat/rooms/${encodeURIComponent(room.roomId)}/photo`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Couldn’t remove the picture.');
      setPhotoUrl(null);
    });

  const leave = () => {
    if (!window.confirm('Leave this group? You won’t see its messages unless someone adds you back.')) return;
    act(async () => {
      await client.request('leave_group', { roomId: room.roomId });
      onLeft();
    });
  };

  return (
    <aside className={styles.panel} aria-label="Chat info">
      <header className={styles.panelHead}>
        <h2>{isGroup ? 'Group info' : 'Chat info'}</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>

      <div className={styles.infoPhoto}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" />
        ) : (
          <span aria-hidden="true">{(room.title || 'MG').slice(0, 2).toUpperCase()}</span>
        )}
        {room.canManage ? (
          <div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
            <button type="button" onClick={() => fileRef.current?.click()}>
              {photoUrl ? 'Change picture' : 'Add a picture'}
            </button>
            {photoUrl ? (
              <button type="button" onClick={removePhoto}>
                Remove
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isGroup && room.canManage ? (
        <form
          className={styles.renameRow}
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && name.trim() !== room.title) act(() => client.request('rename_group', { roomId: room.roomId, title: name.trim() }));
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Group name" />
          <button type="submit">Save name</button>
        </form>
      ) : (
        <h3 className={styles.infoTitle}>{room.title}</h3>
      )}
      {room.regarding ? (
        <p className={styles.regardingRow}>
          About:{' '}
          {room.regarding.slug ? <Link href={`/events/${room.regarding.slug}`}>{room.regarding.title}</Link> : room.regarding.title}
        </p>
      ) : null}

      <h3 className={styles.membersTitle}>
        {members.length} {room.kind === 'EVENT' ? 'going' : 'members'}
      </h3>
      <ul className={styles.memberList}>
        {members.map((m) => (
          <li key={m.id}>
            <Link href={`/members/${m.id}`}>{m.id === me.id ? `${m.name} (you)` : m.name}</Link>
            {m.isAdmin ? <span className={styles.adminBadge}>Admin</span> : null}
            {isGroup && room.canManage && m.id !== me.id ? (
              <span className={styles.memberActions}>
                <button type="button" onClick={() => act(() => client.request('set_admin', { roomId: room.roomId, userId: m.id, isAdmin: !m.isAdmin }))}>
                  {m.isAdmin ? 'Remove admin' : 'Make admin'}
                </button>
                <button
                  type="button"
                  onClick={() => window.confirm(`Remove ${m.name} from the group?`) && act(() => client.request('remove_member', { roomId: room.roomId, userId: m.id }))}
                >
                  Remove
                </button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {isGroup ? (
        adding ? (
          <div className={styles.addPeople}>
            <MemberPicker picked={picked} setPicked={setPicked} exclude={members.map((m) => m.id)} />
            <button
              type="button"
              className={styles.primaryButton}
              disabled={!picked.size}
              onClick={() =>
                act(async () => {
                  await client.request('add_members', { roomId: room.roomId, userIds: [...picked.keys()] });
                  setPicked(new Map());
                  setAdding(false);
                })
              }
            >
              Add {picked.size || ''} {picked.size === 1 ? 'person' : 'people'}
            </button>
          </div>
        ) : (
          <button type="button" className={styles.secondaryButton} onClick={() => setAdding(true)}>
            Add people
          </button>
        )
      ) : null}
      {isGroup ? (
        <button type="button" className={styles.dangerButton} onClick={leave}>
          Leave group
        </button>
      ) : null}
      {error ? <p className={styles.panelError}>{error}</p> : null}
    </aside>
  );
}
