// WebSocket client for chat-server/ (protocol: documentation/app-api.md).
// Plain JS with no React Native imports so it can be tested in Node.
//
// - Authenticates on every (re)connect, then re-joins open rooms.
// - request() returns a promise matched to the server's reply by `ref`.
// - send() is optimistic: messages get a clientId, stay "pending" while
//   offline and are retried on reconnect; the server ignores duplicates.

const BACKOFF_MS = [500, 1000, 2000, 5000, 10000, 20000];
const REQUEST_TIMEOUT_MS = 15000;

let counter = 0;
export function makeClientId() {
  counter = (counter + 1) % 1e6;
  return `m${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export class ChatClient {
  constructor({ url, getToken, WebSocketImpl = globalThis.WebSocket, setTimer = setTimeout, clearTimer = clearTimeout }) {
    this.url = url;
    this.getToken = getToken;
    this.WebSocketImpl = WebSocketImpl;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.socket = null;
    this.status = 'idle'; // idle | connecting | ready | offline | closed | unauthorized
    this.listeners = new Map();
    this.pending = new Map(); // ref -> { resolve, reject, timer }
    this.queue = []; // requests made before ready
    this.outbox = new Map(); // clientId -> send payload (unconfirmed messages)
    this.joined = new Set(); // roomIds to re-join after reconnect
    this.attempt = 0;
    this.retryTimer = null;
    this.nextRef = 1;
    this.user = null;
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  emit(event, payload) {
    for (const fn of this.listeners.get(event) || []) {
      try {
        fn(payload);
      } catch (error) {
        console.warn('chat listener error', error);
      }
    }
  }

  setStatus(status) {
    if (this.status === status) return;
    this.status = status;
    this.emit('status', status);
  }

  connect() {
    if (this.status === 'closed' || this.status === 'unauthorized') return;
    if (this.socket && (this.status === 'connecting' || this.status === 'ready')) return;
    this.clearTimer(this.retryTimer);
    this.setStatus('connecting');
    let socket;
    try {
      socket = new this.WebSocketImpl(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = async () => {
      const token = await this.getToken();
      if (!token) return this.close('unauthorized');
      this.raw({ type: 'auth', token, ref: 'auth' });
    };
    socket.onmessage = (event) => this.handle(event.data);
    socket.onerror = () => {};
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.failPending('Connection lost.');
      if (this.status !== 'closed' && this.status !== 'unauthorized') this.scheduleReconnect();
    };
  }

  // Call when the app returns to the foreground or the network comes back.
  reconnectNow() {
    if (this.status === 'offline' || this.status === 'idle') {
      this.attempt = 0;
      this.connect();
    }
  }

  scheduleReconnect() {
    this.setStatus('offline');
    const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)];
    this.attempt += 1;
    this.retryTimer = this.setTimer(() => this.connect(), delay);
  }

  close(reason = 'closed') {
    this.setStatus(reason);
    this.clearTimer(this.retryTimer);
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      try {
        socket.close();
      } catch {}
    }
    this.failPending('Disconnected.');
  }

  raw(payload) {
    try {
      this.socket?.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  failPending(message) {
    for (const [, p] of this.pending) {
      this.clearTimer(p.timer);
      p.reject(Object.assign(new Error(message), { code: 'disconnected' }));
    }
    this.pending.clear();
  }

  // Sends a request and resolves with the server's reply (rejects on `error`).
  request(type, payload = {}) {
    return new Promise((resolve, reject) => {
      const ref = this.nextRef++;
      const message = { type, ...payload, ref };
      const timer = this.setTimer(() => {
        this.pending.delete(ref);
        reject(Object.assign(new Error('Timed out.'), { code: 'timeout' }));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(ref, { resolve, reject, timer });
      if (this.status === 'ready') this.raw(message);
      else this.queue.push(message);
    });
  }

  handle(data) {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    if (msg.ref === 'auth') {
      if (msg.type === 'ready') {
        this.user = msg.user;
        this.attempt = 0;
        this.setStatus('ready');
        this.emit('ready', msg.user);
        this.flush();
      } else if (msg.type === 'error') {
        this.close('unauthorized');
        this.emit('unauthorized', msg);
      }
      return;
    }

    if (msg.ref !== undefined && this.pending.has(msg.ref)) {
      const p = this.pending.get(msg.ref);
      this.pending.delete(msg.ref);
      this.clearTimer(p.timer);
      if (msg.type === 'error') p.reject(Object.assign(new Error(msg.message), { code: msg.code }));
      else p.resolve(msg);
      if (msg.type === 'sent') this.confirmSent(msg);
      return;
    }

    if (msg.type === 'removed' && msg.roomId) this.joined.delete(msg.roomId);
    this.emit(msg.type, msg);
  }

  flush() {
    // Re-join rooms the screen still has open, then send anything queued.
    for (const roomId of this.joined) {
      this.request('join', { roomId })
        .then((reply) => this.emit('rejoined', reply))
        .catch(() => {});
    }
    const queued = this.queue;
    this.queue = [];
    for (const message of queued) this.raw(message);
    for (const payload of this.outbox.values()) this.trySend(payload);
  }

  // Open a room by id, an event's chat by eventId, or a DM by userId.
  async join({ roomId, eventId, userId }) {
    const reply = userId
      ? await this.request('dm', { userId })
      : await this.request('join', roomId ? { roomId } : { eventId });
    this.joined.add(reply.roomId);
    return reply;
  }

  leave(roomId) {
    this.joined.delete(roomId);
    if (this.status === 'ready') this.raw({ type: 'leave', roomId });
  }

  // Optimistic send: returns the pending message immediately.
  send(roomId, { body, replyToId, kind = 'send' }) {
    const clientId = makeClientId();
    const payload = { kind, roomId, clientId, body, replyToId: replyToId || undefined };
    this.outbox.set(clientId, payload);
    const optimistic = {
      id: `pending:${clientId}`,
      clientId,
      roomId,
      kind: kind === 'announce' ? 'ANNOUNCEMENT' : 'TEXT',
      body,
      replyToId: replyToId || null,
      createdAt: new Date().toISOString(),
      sender: this.user ? { id: this.user.id, name: this.user.name, isAdmin: this.user.isAdmin } : null,
      status: 'pending'
    };
    this.trySend(payload);
    return optimistic;
  }

  trySend(payload) {
    if (this.status !== 'ready') return;
    const { kind, ...rest } = payload;
    this.request(kind, rest).catch((error) => {
      // Network problems keep it in the outbox for the next reconnect;
      // a refusal from the server (blocked, too long…) fails it for good.
      if (error.code === 'disconnected' || error.code === 'timeout') return;
      this.outbox.delete(payload.clientId);
      this.emit('send_failed', { clientId: payload.clientId, roomId: payload.roomId, message: error.message, code: error.code });
    });
  }

  confirmSent(reply) {
    if (!reply.clientId) return;
    this.outbox.delete(reply.clientId);
    this.emit('sent', reply);
  }

  retry(clientId, roomId, body) {
    const payload = { kind: 'send', roomId, clientId, body };
    this.outbox.set(clientId, payload);
    this.trySend(payload);
  }
}
