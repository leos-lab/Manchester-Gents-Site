'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChatClient } from '@/lib/chatClient';
import styles from './ChatApp.module.css';

const GROUP_GAP_MS = 5 * 60 * 1000;

function time(iso) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'MG';
}

function Avatar({ name, src, size = 40 }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={styles.avatar} style={{ width: size, height: size }} />
  ) : (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export default function ChatApp({ me, initialOpen }) {
  const clientRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [configured, setConfigured] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [open, setOpen] = useState(null); // joined reply
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [announce, setAnnounce] = useState(false);
  const [typing, setTyping] = useState(null);
  const [error, setError] = useState(null);
  const [noMore, setNoMore] = useState(false);
  const listRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTyping = useRef(0);
  const openRef = useRef(null);
  openRef.current = open;

  const refreshRooms = useCallback(async () => {
    try {
      const reply = await clientRef.current?.request('rooms');
      if (reply) setRooms(reply.rooms || []);
    } catch {}
  }, []);

  // Connect once; tokens are fetched fresh on every (re)connect.
  useEffect(() => {
    let cancelled = false;
    let client;
    (async () => {
      const first = await fetch('/api/v1/chat/token', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({}));
      if (cancelled) return;
      if (!first.chatUrl) {
        setConfigured(false);
        return;
      }
      client = new ChatClient({
        url: first.chatUrl,
        getToken: async () => {
          const res = await fetch('/api/v1/chat/token', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({}));
          return res.token || null;
        }
      });
      clientRef.current = client;
      client.on('status', setStatus);
      client.on('ready', refreshRooms);
      client.on('rooms_changed', refreshRooms);
      client.on('unauthorized', () => setError('Your session has ended. Sign in again to keep chatting.'));
      client.connect();
    })();
    const onVisible = () => document.visibilityState === 'visible' && clientRef.current?.reconnectNow();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      client?.close();
    };
  }, [refreshRooms]);

  const openRoom = useCallback(async (target) => {
    const client = clientRef.current;
    if (!client) return;
    if (openRef.current) client.leave(openRef.current.roomId);
    setError(null);
    try {
      const reply = await client.join(target);
      setOpen(reply);
      setMessages(reply.messages || []);
      setNoMore((reply.messages || []).length < 50);
      setAnnounce(false);
      client.request('read', { roomId: reply.roomId }).then(refreshRooms).catch(() => {});
      const url = new URL(window.location.href);
      url.search = `?room=${encodeURIComponent(reply.roomId)}`;
      window.history.replaceState(null, '', url);
    } catch (e) {
      setError(e.message);
    }
  }, [refreshRooms]);

  // Open the room from the URL once connected.
  const openedInitial = useRef(false);
  useEffect(() => {
    if (status === 'ready' && initialOpen && !openedInitial.current) {
      openedInitial.current = true;
      openRoom(initialOpen);
    }
  }, [status, initialOpen, openRoom]);

  // Live events for the open room.
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return undefined;
    const roomId = open?.roomId;
    const upsert = (m) =>
      setMessages((list) => {
        const i = list.findIndex((x) => x.id === m.id || (m.clientId && x.clientId === m.clientId));
        if (i === -1) return [...list, m];
        const next = list.slice();
        next[i] = { ...m, status: undefined };
        return next;
      });
    const offs = [
      client.on('message', ({ message }) => {
        if (message.roomId === roomId) {
          upsert(message);
          setTyping(null);
          if (document.visibilityState === 'visible') client.request('read', { roomId }).catch(() => {});
        }
        refreshRooms();
      }),
      client.on('sent', ({ message }) => message.roomId === roomId && upsert(message)),
      client.on('send_failed', ({ clientId, roomId: r, message }) => {
        if (r !== roomId) return;
        setMessages((list) => list.map((m) => (m.clientId === clientId ? { ...m, status: 'failed' } : m)));
        setError(message);
      }),
      client.on('deleted', ({ roomId: r, messageId }) => {
        if (r === roomId) setMessages((list) => list.map((m) => (m.id === messageId ? { ...m, deleted: true, body: null } : m)));
      }),
      client.on('typing', ({ roomId: r, user }) => {
        if (r !== roomId) return;
        setTyping(user.name);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 4000);
      }),
      client.on('rejoined', (reply) => {
        if (reply.roomId !== roomId) return;
        setMessages((list) => {
          const unsent = list.filter((m) => m.status);
          const seen = new Set(reply.messages.map((m) => m.clientId).filter(Boolean));
          return [...reply.messages, ...unsent.filter((m) => !seen.has(m.clientId))];
        });
      }),
      client.on('removed', ({ roomId: r }) => {
        if (r !== roomId) return;
        setOpen(null);
        setMessages([]);
        setError('You’ve left this chat because your RSVP was cancelled.');
        refreshRooms();
      })
    ];
    return () => offs.forEach((off) => off());
  }, [open?.roomId, refreshRooms, status]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) el.scrollTop = el.scrollHeight;
  }, [messages]);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open?.roomId]);

  const loadOlder = async () => {
    const client = clientRef.current;
    if (!client || !open || noMore || !messages.length) return;
    const el = listRef.current;
    const before = el?.scrollHeight || 0;
    try {
      const reply = await client.request('history', { roomId: open.roomId, before: messages[0].createdAt });
      if (reply.messages.length < 50) setNoMore(true);
      setMessages((list) => [...reply.messages, ...list]);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - before;
      });
    } catch {}
  };

  const send = (e) => {
    e?.preventDefault();
    const body = text.trim();
    const client = clientRef.current;
    if (!body || !client || !open) return;
    setMessages((list) => [...list, client.send(open.roomId, { body, kind: announce ? 'announce' : 'send' })]);
    setText('');
    setAnnounce(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) send(e);
  };

  const onChange = (e) => {
    setText(e.target.value);
    const now = Date.now();
    if (open && now - lastTyping.current > 2500) {
      lastTyping.current = now;
      clientRef.current?.raw({ type: 'typing', roomId: open.roomId });
    }
  };

  const act = async (type, payload, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await clientRef.current.request(type, payload);
      if (type === 'block') setMessages((list) => list.filter((m) => m.sender?.id !== payload.userId));
      if (type === 'report') setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleMute = async () => {
    try {
      const reply = await clientRef.current.request('mute', { roomId: open.roomId, muted: !open.muted });
      setOpen((o) => ({ ...o, muted: reply.muted }));
      refreshRooms();
    } catch (e) {
      setError(e.message);
    }
  };

  const openTitle = useMemo(() => {
    if (!open) return '';
    return rooms.find((r) => r.id === open.roomId)?.title || open.title || 'Chat';
  }, [open, rooms]);
  const openOther = open?.kind === 'DIRECT' ? rooms.find((r) => r.id === open.roomId)?.other : null;

  if (!configured) {
    return (
      <main className={styles.unavailable}>
        <h1 className="heading-font">Chats</h1>
        <p>Chat isn’t switched on yet. Set CHAT_SERVER_URL on the website to connect it.</p>
      </main>
    );
  }

  return (
    <main className={`${styles.app} ${open ? styles.hasOpen : ''}`}>
      <aside className={styles.sidebar} aria-label="Your chats">
        <div className={styles.sidebarHead}>
          <h1 className="heading-font">Chats</h1>
          <Link href="/members" className={styles.newButton}>New message</Link>
        </div>
        {status !== 'ready' ? <p className={styles.status}>{status === 'connecting' ? 'Connecting…' : 'Reconnecting…'}</p> : null}
        <ul className={styles.rooms}>
          {rooms.map((room) => {
            const unread = room.unread > 0 && !room.muted;
            return (
              <li key={room.id}>
                <button
                  type="button"
                  onClick={() => openRoom({ roomId: room.id })}
                  className={`${styles.room} ${open?.roomId === room.id ? styles.roomActive : ''}`}
                  aria-current={open?.roomId === room.id ? 'true' : undefined}
                >
                  {room.kind === 'COMMUNITY' ? (
                    <span className={`${styles.roomThumb} ${styles.roomThumbCloth}`} aria-hidden="true" />
                  ) : room.kind === 'EVENT' ? (
                    room.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={room.coverImageUrl} alt="" className={styles.roomThumb} />
                    ) : (
                      <span className={`${styles.roomThumb} ${styles.roomThumbCloth}`} aria-hidden="true" />
                    )
                  ) : (
                    <Avatar name={room.other?.name} src={room.other?.photoUrl} size={48} />
                  )}
                  <span className={styles.roomText}>
                    <span className={`${styles.roomTitle} ${unread ? styles.unread : ''}`}>{room.title}</span>
                    <span className={styles.roomPreview}>
                      {room.lastKind === 'ANNOUNCEMENT' ? '📣 ' : room.lastKind === 'LOCATION' ? '📍 ' : room.lastKind === 'IMAGE' ? '📷 ' : ''}
                      {room.lastBody ||
                        (room.lastKind === 'LOCATION' ? 'Location' : room.lastKind === 'IMAGE' ? 'Photo' : null) ||
                        (room.kind === 'COMMUNITY' ? 'Everyone at Manchester Gents' : room.kind === 'EVENT' ? 'Event chat' : 'Say hello')}
                      {room.closed ? ' · Closed' : ''}
                    </span>
                  </span>
                  <span className={styles.roomMeta}>
                    {room.lastMessageAt ? <span>{time(room.lastMessageAt)}</span> : null}
                    {unread ? <span className={styles.badge}>{room.unread > 99 ? '99+' : room.unread}</span> : null}
                    {room.muted ? <span className={styles.muted}>Muted</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {status === 'ready' && rooms.length === 0 ? (
          <p className={styles.emptyRooms}>
            Reserve a spot at an <Link href="/events">event</Link> to join its chat, or message any member.
          </p>
        ) : null}
      </aside>

      <section className={styles.conversation} aria-label={open ? openTitle : 'Conversation'}>
        {open ? (
          <>
            <header className={styles.convHead}>
              <button type="button" className={styles.back} onClick={() => setOpen(null)}>
                Back
              </button>
              {openOther ? (
                <Link href={`/members/${openOther.id}`} className={styles.convTitle}>
                  <Avatar name={openOther.name} src={openOther.photoUrl} size={32} />
                  <span>{openOther.name}</span>
                </Link>
              ) : (
                <h2 className={styles.convTitle}>{openTitle}</h2>
              )}
              <button type="button" className={styles.headButton} onClick={toggleMute}>
                {open.muted ? 'Unmute' : 'Mute'}
              </button>
            </header>
            <div className={styles.messages} ref={listRef} onScroll={(e) => e.currentTarget.scrollTop < 60 && loadOlder()}>
              {messages.length === 0 ? (
                <p className={styles.hello}>
                  {open.kind === 'DIRECT'
                    ? 'Only the two of you can see these messages.'
                    : 'Messages here are seen by everyone going to this event.'}
                </p>
              ) : null}
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const mine = m.sender?.id === me.id;
                const startsGroup =
                  !prev || prev.sender?.id !== m.sender?.id || new Date(m.createdAt) - new Date(prev.createdAt) > GROUP_GAP_MS;
                if (m.kind === 'ANNOUNCEMENT') {
                  return (
                    <div key={m.id} className={styles.announcement}>
                      <strong>Announcement from {m.sender?.name || 'Manchester Gents'}</strong>
                      <p>{m.deleted ? 'Message deleted' : m.body}</p>
                      <span>{time(m.createdAt)}</span>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={`${styles.message} ${mine ? styles.mine : ''} ${startsGroup ? styles.groupStart : ''}`}>
                    {!mine && startsGroup ? (
                      <Link href={m.sender ? `/members/${m.sender.id}` : '#'} className={styles.sender}>
                        <Avatar name={m.sender?.name} src={m.sender?.photoUrl} size={28} />
                        <span>{m.sender?.name || 'Former member'}</span>
                      </Link>
                    ) : null}
                    <div className={styles.bubbleRow}>
                      <p className={`${styles.bubble} ${m.status ? styles.pending : ''}`}>
                        {!m.deleted && m.imageUrl && !m.status ? (
                          // Private photo: the website checks you're in this chat.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.imageUrl.startsWith('pinstripe:') ? `/api/v1/chat/messages/${encodeURIComponent(m.id)}/image?v=medium` : m.imageUrl}
                            alt="Photo"
                            className={styles.chatImage}
                            loading="lazy"
                          />
                        ) : null}
                        {!m.deleted && m.location ? (
                          <a
                            href={`https://maps.apple.com/?ll=${m.location.latitude},${m.location.longitude}&q=${encodeURIComponent(m.location.name || 'Shared location')}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            📍 {m.location.name || 'Shared location'}
                          </a>
                        ) : null}
                        {m.deleted ? <em>Message deleted</em> : m.body}
                      </p>
                      {!m.deleted && !m.status ? (
                        <details className={styles.menu}>
                          <summary aria-label="Message options">⋯</summary>
                          <div>
                            {!mine && m.sender ? (
                              <>
                                <button type="button" onClick={() => act('report', { messageId: m.id, reason: 'Reported from website' }, 'Report this message to the Manchester Gents team?')}>
                                  Report
                                </button>
                                <button type="button" onClick={() => act('block', { userId: m.sender.id }, `Block ${m.sender.name}?`)}>
                                  Block {m.sender.name}
                                </button>
                              </>
                            ) : null}
                            {mine || (me.isAdmin && open.kind === 'EVENT') ? (
                              <button type="button" onClick={() => act('delete', { messageId: m.id }, 'Delete this message for everyone?')}>
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </div>
                    <span className={styles.time}>
                      {m.status === 'failed' ? 'Not sent' : m.status === 'pending' ? 'Sending…' : time(m.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
            {typing ? <p className={styles.typing}>{typing} is typing…</p> : null}
            {open.canPost ? (
              <form className={styles.composer} onSubmit={send}>
                {me.isAdmin && open.kind !== 'DIRECT' ? (
                  <label className={styles.announceToggle}>
                    <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} />
                    Announcement
                  </label>
                ) : null}
                <textarea
                  value={text}
                  onChange={onChange}
                  onKeyDown={onKeyDown}
                  rows={1}
                  maxLength={2000}
                  placeholder={announce ? 'Announcement to everyone going' : 'Message'}
                  aria-label="Message"
                />
                <button type="submit" disabled={!text.trim()}>
                  {announce ? 'Announce' : 'Send'}
                </button>
              </form>
            ) : (
              <p className={styles.readOnly}>
                {open.closed ? (
                  <>
                    This chat closed 48 hours after the social. Keep talking in the{' '}
                    <button type="button" className={styles.linkButton} onClick={() => openRoom({ roomId: 'community' })}>
                      community chat
                    </button>
                    , or message someone directly.
                  </>
                ) : open.kind === 'DIRECT' ? (
                  'You can’t message this member.'
                ) : (
                  'This chat is read-only.'
                )}
              </p>
            )}
          </>
        ) : (
          <div className={styles.placeholder}>
            <p>Pick a chat, or start a new message.</p>
          </div>
        )}
        {error ? (
          <p className={styles.error} role="alert">
            {error} <button type="button" onClick={() => setError(null)}>Dismiss</button>
          </p>
        ) : null}
      </section>
    </main>
  );
}
