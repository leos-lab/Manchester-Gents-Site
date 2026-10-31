// End-to-end: the app's ChatClient talking to the real chat-server ChatHub
// (backed by Postgres) through an in-memory socket. Needs the local test
// database from chat-server's tests; skipped if it isn't running.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ChatClient } from '../src/lib/chatClient.js';
import { ChatHub } from '../../chat-server/src/hub.js';
import { createStore } from '../../chat-server/src/store.js';
import { signChatToken } from '../../chat-server/src/token.js';
import { createShimPool } from '../../chat-server/test/pgShim.js';

const PG = { host: process.env.PGHOST || '/home/claude/.pgtest', port: 5433, db: 'mg' };
const SECRET = 'test-secret';
let dbUp = true;
const sql = (q) => execFileSync('psql', ['-X', '-q', '-A', '-t', '-h', PG.host, '-p', String(PG.port), '-U', 'postgres', PG.db, '-c', q]).toString().trim();
try { sql('SELECT 1'); } catch { dbUp = false; }

function seed() {
  sql(`TRUNCATE "User", "Event", "GlobalSetting", "ChatRoom" CASCADE;
    INSERT INTO "GlobalSetting" ("key","value","updatedAt") VALUES ('sessionVersion','1',now());
    INSERT INTO "User" ("id","email","passwordHash","instagramHandle","firstName","shareFirstName","role","updatedAt") VALUES
      ('alex','a@x','x','alex','Alex',false,'MEMBER',now()), ('sam','b@x','x','sam','Sam',false,'MEMBER',now());
    INSERT INTO "Event" ("id","slug","title","startTime","updatedAt") VALUES ('ev1','jan','January Social','2027-01-20 19:00',now());
    INSERT INTO "EventSignup" ("id","userId","eventId") VALUES ('s1','alex','ev1'),('s2','sam','ev1');`);
}

// In-memory WebSocket connected to a ChatHub; `drop()` simulates losing signal.
function socketFactory(hub) {
  const sockets = [];
  class MemorySocket {
    constructor() {
      sockets.push(this);
      this.conn = { send: (m) => queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(m) })), close() {} };
      hub.attach(this.conn);
      queueMicrotask(() => this.onopen?.());
    }
    send(text) { hub.handle(this.conn, text); }
    close() { hub.detach(this.conn); queueMicrotask(() => this.onclose?.()); }
    drop() { this.close(); }
  }
  return { MemorySocket, sockets };
}

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return; await tick(20); }
  throw new Error('condition not met in time');
}

test('app chat client: join, live messages, offline retry without duplicates', { skip: !dbUp && 'test database not running' }, async () => {
  seed();
  const hub = new ChatHub({ store: createStore(createShimPool(PG)), secret: SECRET, sendPush: async () => {}, log: { error() {} } });
  const { MemorySocket, sockets } = socketFactory(hub);
  const make = (userId) => new ChatClient({
    url: 'memory://chat',
    getToken: async () => signChatToken({ sub: userId, sv: '1' }, SECRET, 60),
    WebSocketImpl: MemorySocket
  });

  const alex = make('alex');
  const sam = make('sam');
  alex.connect(); sam.connect();
  await until(() => alex.status === 'ready' && sam.status === 'ready');
  assert.equal(alex.user.name, 'Alex');

  const joined = await alex.join({ eventId: 'ev1' });
  assert.equal(joined.title, 'January Social');
  await sam.join({ roomId: joined.roomId });

  const received = [];
  sam.on('message', (m) => received.push(m.message.body));
  const sent = [];
  alex.on('sent', (r) => sent.push(r.message.body));

  const optimistic = alex.send(joined.roomId, { body: 'Evening all' });
  assert.equal(optimistic.status, 'pending');
  await until(() => received.includes('Evening all'));
  assert.deepEqual(sent, ['Evening all']);

  // Alex loses signal, sends while offline, then reconnects automatically.
  sockets[0].drop();
  await until(() => alex.status === 'offline');
  alex.send(joined.roomId, { body: 'Sent from the tram' });
  await until(() => alex.status === 'ready', 5000);
  await until(() => received.includes('Sent from the tram'), 5000);

  // Rooms re-joined after reconnect: Alex still gets live messages.
  const alexGot = [];
  alex.on('message', (m) => alexGot.push(m.message.body));
  sam.send(joined.roomId, { body: 'Welcome back' });
  await until(() => alexGot.includes('Welcome back'));

  assert.equal(sql(`SELECT count(*) FROM "ChatMessage" WHERE "body" = 'Sent from the tram'`), '1', 'no duplicate after retry');

  // Server refusal surfaces as send_failed (message too long).
  const failures = [];
  alex.on('send_failed', (f) => failures.push(f.code));
  alex.send(joined.roomId, { body: 'x'.repeat(2001) });
  await until(() => failures.includes('too_long'));

  // Unread count and rooms list via request().
  const rooms = await sam.request('rooms');
  assert.equal(rooms.rooms[0].title, 'January Social');

  // Cancelling the RSVP removes Alex from the room live.
  const removed = [];
  alex.on('removed', (r) => removed.push(r.roomId));
  sql(`DELETE FROM "EventSignup" WHERE "id" = 's1'`);
  await hub.onMembershipChange({ eventId: 'ev1', userId: 'alex', op: 'DELETE' });
  await until(() => removed.includes(joined.roomId));
  assert.equal(alex.joined.has(joined.roomId), false);

  alex.close(); sam.close();
});

test('app chat client: bad token stops reconnecting', { skip: !dbUp && 'test database not running' }, async () => {
  seed();
  const hub = new ChatHub({ store: createStore(createShimPool(PG)), secret: SECRET, sendPush: async () => {}, log: { error() {} } });
  const { MemorySocket } = socketFactory(hub);
  const client = new ChatClient({ url: 'memory://chat', getToken: async () => 'not-a-token', WebSocketImpl: MemorySocket });
  let unauthorized = false;
  client.on('unauthorized', () => { unauthorized = true; });
  client.connect();
  await until(() => unauthorized);
  assert.equal(client.status, 'unauthorized');
});
