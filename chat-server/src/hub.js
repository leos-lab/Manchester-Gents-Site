// Transport-agnostic chat logic. A "conn" is anything with send(obj) and close().
// server.js plugs real WebSockets in; tests plug in fakes.
import { verifyChatToken } from './token.js';
import { COMMUNITY_ROOM_ID, displayName } from './store.js';

const MAX_BODY = 2000;
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 12;
const TYPING_TTL_MS = 4000;

// { latitude, longitude, name? } with sane coordinates, or null.
function parseLocation(loc) {
  if (!loc || typeof loc !== 'object') return null;
  const latitude = Number(loc.latitude);
  const longitude = Number(loc.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const name = typeof loc.name === 'string' ? loc.name.trim().slice(0, 120) || null : null;
  return { latitude, longitude, name };
}

export class ChatHub {
  constructor({ store, sendPush, secret, log = console }) {
    this.store = store;
    this.sendPush = sendPush;
    this.secret = secret;
    this.log = log;
    this.rooms = new Map(); // roomId -> Set<conn>
    this.conns = new Set();
  }

  attach(conn) {
    conn.state = { user: null, rooms: new Set(), sent: [], typingAt: 0 };
    this.conns.add(conn);
  }

  detach(conn) {
    for (const eventId of conn.state?.rooms || []) this.rooms.get(eventId)?.delete(conn);
    this.conns.delete(conn);
  }

  reply(conn, req, payload) {
    conn.send({ ...payload, ...(req?.ref !== undefined ? { ref: req.ref } : {}) });
  }

  fail(conn, req, code, message) {
    this.reply(conn, req, { type: 'error', code, message });
  }

  broadcast(roomId, payload, { except } = {}) {
    for (const c of this.rooms.get(roomId) || []) {
      if (c === except) continue;
      // Hide messages from people this member has blocked.
      if (payload.type === 'message' && payload.message.sender &&
          c.state.blocked?.has(payload.message.sender.id)) continue;
      c.send(payload);
    }
  }

  onlineUserIds(roomId) {
    return [...(this.rooms.get(roomId) || [])].map((c) => c.state.user.id);
  }

  async handle(conn, raw) {
    let req;
    try {
      req = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return this.fail(conn, null, 'bad_json', 'Message was not valid JSON.');
    }
    if (!req || typeof req.type !== 'string') return this.fail(conn, req, 'bad_request', 'Missing type.');

    try {
      if (req.type === 'auth') return await this.auth(conn, req);
      if (!conn.state.user) return this.fail(conn, req, 'unauthenticated', 'Send auth first.');
      const handler = {
        rooms: this.rooms_,
        join: this.join,
        dm: this.dm,
        leave: this.leave,
        history: this.history,
        send: this.sendMessage,
        announce: this.announce,
        read: this.read,
        typing: this.typing,
        mute: this.mute,
        delete: this.deleteMessage,
        report: this.report,
        block: this.block,
        unblock: this.unblock,
        ping: (c, r) => this.reply(c, r, { type: 'pong' })
      }[req.type];
      if (!handler) return this.fail(conn, req, 'unknown_type', `Unknown type ${req.type}.`);
      return await handler.call(this, conn, req);
    } catch (error) {
      this.log.error('chat handler error', req.type, error);
      return this.fail(conn, req, 'server_error', 'Something went wrong.');
    }
  }

  async auth(conn, req) {
    const claims = verifyChatToken(req.token, this.secret);
    if (!claims) return this.fail(conn, req, 'bad_token', 'Sign in again.');
    const [user, version] = await Promise.all([
      this.store.getUser(claims.sub),
      this.store.getSessionVersion()
    ]);
    // Same kill switches as the site: the global version logs everyone out; a
    // member's own version (bumped on password reset) signs out just them.
    if (!user || claims.sv !== version || (claims.uv ?? 0) !== (user.sessionVersion ?? 0)) {
      return this.fail(conn, req, 'bad_token', 'Sign in again.');
    }
    conn.state.user = user;
    conn.state.blocked = new Set(await this.store.blockedIds(user.id));
    this.reply(conn, req, {
      type: 'ready',
      user: { id: user.id, name: displayName(user), isAdmin: user.role === 'ADMIN' }
    });
  }

  async rooms_(conn, req) {
    const rooms = await this.store.listRooms(conn.state.user);
    this.reply(conn, req, { type: 'rooms', rooms });
  }

  // Open a room by roomId, or an event's chat by eventId (created on first use).
  async join(conn, req) {
    let roomId = req.roomId;
    if (!roomId && req.eventId) roomId = (await this.store.eventRoom(req.eventId))?.id;
    if (roomId === COMMUNITY_ROOM_ID) await this.store.communityRoom();
    const access = roomId ? await this.store.getAccess(conn.state.user, roomId) : { canRead: false };
    if (!access.canRead) return this.fail(conn, req, 'forbidden', 'RSVP to join this chat.');
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Set());
    this.rooms.get(roomId).add(conn);
    conn.state.rooms.add(roomId);
    const messages = await this.store.history(roomId);
    this.reply(conn, req, {
      type: 'joined',
      roomId,
      kind: access.room.kind,
      eventId: access.room.eventId,
      title: access.title || null,
      otherUserId: access.otherUserId || null,
      canPost: access.canPost,
      // Event chats close 48h after the event; the app points people to the
      // community chat or DMs.
      closed: Boolean(access.closed),
      closesAt: access.closesAt || null,
      muted: access.muted,
      messages: this.filterBlocked(conn, messages)
    });
  }

  // Start (or reopen) a DM with any member.
  async dm(conn, req) {
    const me = conn.state.user;
    const other = req.userId ? await this.store.getUser(req.userId) : null;
    if (!other || other.id === me.id || other.isPlaceholder) {
      return this.fail(conn, req, 'not_found', 'Member not found.');
    }
    const room = await this.store.directRoom(me.id, other.id);
    return this.join(conn, { ...req, roomId: room.id });
  }

  leave(conn, req) {
    this.rooms.get(req.roomId)?.delete(conn);
    conn.state.rooms.delete(req.roomId);
    this.reply(conn, req, { type: 'left', roomId: req.roomId });
  }

  async history(conn, req) {
    const access = await this.store.getAccess(conn.state.user, req.roomId);
    if (!access.canRead) return this.fail(conn, req, 'forbidden', 'RSVP to join this chat.');
    const messages = await this.store.history(req.roomId, req.before);
    this.reply(conn, req, {
      type: 'history',
      roomId: req.roomId,
      messages: this.filterBlocked(conn, messages)
    });
  }

  filterBlocked(conn, messages) {
    return messages.filter((m) => !m.sender || !conn.state.blocked.has(m.sender.id));
  }

  rateLimited(conn) {
    const now = Date.now();
    conn.state.sent = conn.state.sent.filter((t) => now - t < RATE_WINDOW_MS);
    if (conn.state.sent.length >= RATE_MAX) return true;
    conn.state.sent.push(now);
    return false;
  }

  async sendMessage(conn, req, kind = 'TEXT') {
    const user = conn.state.user;
    const body = typeof req.body === 'string' ? req.body.trim() : '';
    // Photos are uploaded through the website first (stored privately on
    // Pinstripe as "pinstripe:<id>"; only people in the chat can load them).
    const imageUrl =
      typeof req.imageUrl === 'string' && /^(https:\/\/|pinstripe:[A-Za-z0-9_-]+$)/.test(req.imageUrl) ? req.imageUrl : null;
    const location = parseLocation(req.location);
    if (!body && !imageUrl && !location) return this.fail(conn, req, 'empty', 'Message is empty.');
    if (body.length > MAX_BODY) return this.fail(conn, req, 'too_long', `Keep it under ${MAX_BODY} characters.`);
    if (this.rateLimited(conn)) return this.fail(conn, req, 'rate_limited', 'Slow down a little.');

    const access = await this.store.getAccess(user, req.roomId);
    if (!access.canPost) return this.fail(conn, req, 'forbidden', 'You can’t post in this chat.');
    if (kind === 'ANNOUNCEMENT' && (!access.isAdmin || access.room.kind === 'DIRECT')) {
      return this.fail(conn, req, 'forbidden', 'Announcements are for admins in event and community chats.');
    }

    const { message, duplicate } = await this.store.insertMessage({
      roomId: req.roomId,
      userId: user.id,
      kind: kind === 'TEXT' && location ? 'LOCATION' : kind === 'TEXT' && imageUrl ? 'IMAGE' : kind,
      body: body || null,
      imageUrl,
      location,
      replyToId: req.replyToId || null,
      clientId: typeof req.clientId === 'string' ? req.clientId.slice(0, 64) : null
    });
    this.reply(conn, req, { type: 'sent', clientId: message.clientId, message });
    if (duplicate) return;
    this.broadcast(req.roomId, { type: 'message', message }, { except: conn });

    const isAnnouncement = kind === 'ANNOUNCEMENT';
    // The community chat is busy; only announcements there send a push.
    if (access.room.kind === 'COMMUNITY' && !isAnnouncement) return;
    const targets = await this.store.pushTargets(access, user.id, {
      includeMuted: isAnnouncement,
      excludeUserIds: this.onlineUserIds(req.roomId)
    });
    if (targets.length && this.sendPush) {
      const sender = message.sender?.name || 'Manchester Gents';
      const text = body || (location ? `shared a location${location.name ? `: ${location.name}` : ''}` : 'sent a photo');
      const isDm = access.room.kind === 'DIRECT';
      this.sendPush(targets, {
        title: isDm ? sender : isAnnouncement ? `📣 ${access.title || 'Manchester Gents'}` : access.title,
        body: isDm || isAnnouncement ? text : `${sender}: ${text}`,
        data: { roomId: req.roomId, messageId: message.id, url: `mcrgents://chat/${req.roomId}` },
        threadId: `room-${req.roomId}`
      }).catch((e) => this.log.error('push failed', e));
    }
  }

  announce(conn, req) {
    return this.sendMessage(conn, req, 'ANNOUNCEMENT');
  }

  async read(conn, req) {
    const access = await this.store.getAccess(conn.state.user, req.roomId);
    if (!access.canRead) return this.fail(conn, req, 'forbidden', 'Not in this chat.');
    await this.store.markRead(req.roomId, conn.state.user.id);
    this.reply(conn, req, { type: 'read', roomId: req.roomId });
  }

  typing(conn, req) {
    if (!conn.state.rooms.has(req.roomId)) return;
    const now = Date.now();
    if (now - conn.state.typingAt < TYPING_TTL_MS / 2) return;
    conn.state.typingAt = now;
    const user = conn.state.user;
    this.broadcast(
      req.roomId,
      { type: 'typing', roomId: req.roomId, user: { id: user.id, name: displayName(user) } },
      { except: conn }
    );
  }

  async mute(conn, req) {
    const access = await this.store.getAccess(conn.state.user, req.roomId);
    if (!access.canRead) return this.fail(conn, req, 'forbidden', 'Not in this chat.');
    await this.store.setMuted(req.roomId, conn.state.user.id, req.muted);
    this.reply(conn, req, { type: 'muted', roomId: req.roomId, muted: Boolean(req.muted) });
  }

  async deleteMessage(conn, req) {
    const msg = await this.store.getMessage(req.messageId);
    if (!msg) return this.fail(conn, req, 'not_found', 'Message not found.');
    const user = conn.state.user;
    const access = await this.store.getAccess(user, msg.roomId);
    const isOwn = msg.userId === user.id;
    // Admins moderate event chats; DMs stay private, so only the author deletes there.
    const canModerate = access.isAdmin && access.room?.kind === 'EVENT';
    if (!access.canRead || (!isOwn && !canModerate)) return this.fail(conn, req, 'forbidden', 'Not your message.');
    await this.store.softDelete(msg.id);
    this.broadcast(msg.roomId, { type: 'deleted', roomId: msg.roomId, messageId: msg.id });
    this.reply(conn, req, { type: 'ok' });
  }

  async report(conn, req) {
    const msg = await this.store.getMessage(req.messageId);
    if (!msg) return this.fail(conn, req, 'not_found', 'Message not found.');
    const access = await this.store.getAccess(conn.state.user, msg.roomId);
    if (!access.canRead) return this.fail(conn, req, 'forbidden', 'Not in this chat.');
    await this.store.report(msg.id, conn.state.user.id, req.reason);
    this.reply(conn, req, { type: 'ok' });
    // Alert admins without quoting the message: it may be a private DM.
    const alert = {
      title: 'Message reported',
      body: req.reason ? `Reason: ${String(req.reason).slice(0, 120)}` : 'A member reported a chat message.'
    };
    await this.store
      .saveNotifications(await this.store.adminIds(), { ...alert, path: '/admin/reports' })
      .catch((error) => this.log.error('saving report notification failed', error?.message || error));
    if (this.sendPush) {
      const admins = await this.store.adminPushTargets();
      if (admins.length) {
        this.sendPush(admins, {
          ...alert,
          data: { path: '/admin/reports' }
        }).catch((error) => this.log.error('report push failed', error?.message || error));
      }
    }
  }

  async block(conn, req) {
    if (!req.userId || req.userId === conn.state.user.id) return this.fail(conn, req, 'bad_request', 'Invalid user.');
    await this.store.block(conn.state.user.id, req.userId);
    this.forEachConnOf(conn.state.user.id, (c) => c.state.blocked.add(req.userId));
    this.reply(conn, req, { type: 'ok' });
  }

  async unblock(conn, req) {
    await this.store.unblock(conn.state.user.id, req.userId);
    this.forEachConnOf(conn.state.user.id, (c) => c.state.blocked.delete(req.userId));
    this.reply(conn, req, { type: 'ok' });
  }

  forEachConnOf(userId, fn) {
    for (const c of this.conns) if (c.state.user?.id === userId) fn(c);
  }

  // From the website (admin moderation): a message was removed.
  // From the website: a message it posted (an admin announcement) goes out
  // live, and everyone's chat list updates.
  async onMessageCreated({ roomId, messageId }) {
    const message = await this.store.messageWithSender(messageId);
    if (!message || message.roomId !== roomId) return;
    this.broadcast(roomId, { type: 'message', message });
    this.conns.forEach((c) => c.state.user && c.send({ type: 'rooms_changed' }));
  }

  onMessageDeleted({ roomId, messageId }) {
    if (roomId && messageId) this.broadcast(roomId, { type: 'deleted', roomId, messageId });
  }

  // From the website: a member was banned/unbanned from chat. Reload their
  // details so the change applies to connections that are already open.
  async onUserChanged({ userId }) {
    const conns = [...this.conns].filter((c) => c.state.user?.id === userId);
    if (!conns.length) return;
    const user = await this.store.getUser(userId);
    if (!user) {
      conns.forEach((c) => c.close());
      return;
    }
    conns.forEach((c) => {
      c.state.user = user;
    });
  }

  // Called from Postgres NOTIFY when an RSVP is created, cancelled or removed.
  async onMembershipChange({ eventId, userId, op, status }) {
    const stillMember = op !== 'DELETE' && status === 'CONFIRMED';
    if (stillMember) {
      this.forEachConnOf(userId, (c) => c.send({ type: 'rooms_changed' }));
      return;
    }
    const roomId = await this.store.roomIdForEvent(eventId);
    this.forEachConnOf(userId, (c) => {
      if (c.state.user.role === 'ADMIN') return;
      if (roomId && c.state.rooms.delete(roomId)) this.rooms.get(roomId)?.delete(c);
      c.send({ type: 'removed', roomId, eventId });
      c.send({ type: 'rooms_changed' });
    });
  }
}
