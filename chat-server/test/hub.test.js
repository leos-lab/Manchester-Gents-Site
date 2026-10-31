import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ChatHub } from '../src/hub.js';
import { createStore } from '../src/store.js';
import { signChatToken, verifyChatToken } from '../src/token.js';
import { createShimPool } from './pgShim.js';

const PG = { host: process.env.PGHOST || '/home/claude/.pgtest', port: 5433, db: 'mg' };
const SECRET = 'test-secret';
const sql = (q) => execFileSync('psql', ['-X', '-q', '-h', PG.host, '-p', String(PG.port), '-U', 'postgres', PG.db, '-c', q]);

function seed() {
  sql(`TRUNCATE "User", "Event", "GlobalSetting" CASCADE;
    INSERT INTO "GlobalSetting" ("key","value","updatedAt") VALUES ('sessionVersion','7',now());
    INSERT INTO "User" ("id","email","passwordHash","instagramHandle","firstName","lastName","role","updatedAt") VALUES
      ('admin','a@x','x','manchester.gents','Leo','L','ADMIN',now()),
      ('alex','b@x','x','alex','Alex','Smith','MEMBER',now()),
      ('sam','c@x','x','sam','Sam',NULL,'MEMBER',now()),
      ('outsider','d@x','x','out','Out',NULL,'MEMBER',now());
    INSERT INTO "Event" ("id","slug","title","startTime","updatedAt") VALUES ('ev1','lodge-jan','Lodge Social: January','2027-01-20 19:00',now());
    INSERT INTO "EventSignup" ("id","userId","eventId") VALUES ('s1','alex','ev1'),('s2','sam','ev1');
    INSERT INTO "PushToken" ("id","userId","token","platform","updatedAt") VALUES ('p1','sam','ExponentPushToken[sam]','ios',now());`);
}

function fakeConn() {
  const inbox = [];
  return { inbox, send: (m) => inbox.push(m), close() {}, last: (t) => [...inbox].reverse().find((m) => m.type === t) };
}

async function setup() {
  seed();
  const pushes = [];
  const store = createStore(createShimPool(PG));
  const hub = new ChatHub({ store, secret: SECRET, sendPush: async (targets, msg) => pushes.push({ targets, msg }), log: { error() {} } });
  const connect = async (userId, sv = '7') => {
    const c = fakeConn();
    hub.attach(c);
    await hub.handle(c, JSON.stringify({ type: 'auth', token: signChatToken({ sub: userId, sv }, SECRET, 60) }));
    return c;
  };
  return { hub, store, pushes, connect };
}

test('tokens: valid, tampered and expired', () => {
  const t = signChatToken({ sub: 'u', sv: '1' }, SECRET, 60);
  assert.equal(verifyChatToken(t, SECRET).sub, 'u');
  assert.equal(verifyChatToken(t + 'x', SECRET), null);
  assert.equal(verifyChatToken(t, 'other'), null);
  assert.equal(verifyChatToken(signChatToken({ sub: 'u' }, SECRET, -5), SECRET), null);
});

test('auth rejects an old session version', async () => {
  const { connect } = await setup();
  const c = await connect('alex', '6');
  assert.equal(c.last('error').code, 'bad_token');
});

test('RSVPed members chat, outsiders are refused, offline members get a push', async () => {
  const { hub, connect, pushes } = await setup();
  const alex = await connect('alex');
  assert.equal(alex.last('ready').user.name, 'Alex');
  const outsider = await connect('outsider');

  await hub.handle(outsider, JSON.stringify({ type: 'join', eventId: 'ev1' }));
  assert.equal(outsider.last('error').code, 'forbidden');

  await hub.handle(alex, JSON.stringify({ type: 'join', eventId: 'ev1' }));
  assert.equal(alex.last('joined').canPost, true);

  await hub.handle(alex, JSON.stringify({ type: 'send', eventId: 'ev1', clientId: 'c1', body: 'Evening all' }));
  const sent = alex.last('sent').message;
  assert.equal(sent.body, 'Evening all');
  assert.equal(sent.sender.name, 'Alex');

  // Retried send with the same clientId is not duplicated.
  await hub.handle(alex, JSON.stringify({ type: 'send', eventId: 'ev1', clientId: 'c1', body: 'Evening all' }));
  assert.equal(pushes.length, 1);
  assert.deepEqual(pushes[0].targets.map((t) => t.userId), ['sam']);
  assert.match(pushes[0].msg.body, /^Alex: Evening all$/);

  // Sam joins and sees history; live messages arrive.
  const sam = await connect('sam');
  await hub.handle(sam, JSON.stringify({ type: 'join', eventId: 'ev1' }));
  assert.equal(sam.last('joined').messages.length, 1);
  await hub.handle(alex, JSON.stringify({ type: 'send', eventId: 'ev1', clientId: 'c2', body: 'See you there' }));
  assert.equal(sam.last('message').message.body, 'See you there');
  assert.equal(pushes.length, 1, 'no push to someone already in the room');

  await hub.handle(sam, JSON.stringify({ type: 'rooms' }));
  assert.equal(sam.last('rooms').rooms[0].unread, 2);
  await hub.handle(sam, JSON.stringify({ type: 'read', eventId: 'ev1' }));
  await hub.handle(sam, JSON.stringify({ type: 'rooms' }));
  assert.equal(sam.last('rooms').rooms[0].unread, 0);
});

test('block hides messages, report is stored, cancelling an RSVP removes access', async () => {
  const { hub, connect, store } = await setup();
  const alex = await connect('alex');
  const sam = await connect('sam');
  for (const c of [alex, sam]) await hub.handle(c, JSON.stringify({ type: 'join', eventId: 'ev1' }));

  await hub.handle(alex, JSON.stringify({ type: 'send', eventId: 'ev1', clientId: 'x1', body: 'rude' }));
  const msgId = alex.last('sent').message.id;
  await hub.handle(sam, JSON.stringify({ type: 'report', messageId: msgId, reason: 'rude' }));
  assert.equal(sam.last('ok').type, 'ok');
  assert.match(sql(`SELECT count(*) FROM "ChatReport"`).toString(), /1/);

  await hub.handle(sam, JSON.stringify({ type: 'block', userId: 'alex' }));
  const before = sam.inbox.length;
  await hub.handle(alex, JSON.stringify({ type: 'send', eventId: 'ev1', clientId: 'x2', body: 'hello?' }));
  assert.equal(sam.inbox.length, before, 'blocked sender is hidden');

  // Admin deletes the reported message.
  const admin = await connect('admin');
  await hub.handle(admin, JSON.stringify({ type: 'delete', messageId: msgId }));
  assert.equal(alex.last('deleted').messageId, msgId);
  const hist = await store.history('ev1');
  assert.equal(hist.find((m) => m.id === msgId).body, null);

  // Cancel RSVP -> trigger notifies -> hub removes them.
  sql(`DELETE FROM "EventSignup" WHERE "id" = 's1'`);
  await hub.onMembershipChange({ eventId: 'ev1', userId: 'alex', op: 'DELETE' });
  assert.equal(alex.last('removed').eventId, 'ev1');
  await hub.handle(alex, JSON.stringify({ type: 'send', eventId: 'ev1', clientId: 'x3', body: 'still here?' }));
  assert.equal(alex.last('error').code, 'forbidden');
});

test('announcements: admin only, pushed even to muted members', async () => {
  const { hub, connect, pushes } = await setup();
  const sam = await connect('sam');
  await hub.handle(sam, JSON.stringify({ type: 'mute', eventId: 'ev1', muted: true }));
  const alex = await connect('alex');
  await hub.handle(alex, JSON.stringify({ type: 'announce', eventId: 'ev1', body: 'nope' }));
  assert.equal(alex.last('error').code, 'forbidden');

  const admin = await connect('admin');
  await hub.handle(admin, JSON.stringify({ type: 'announce', eventId: 'ev1', clientId: 'a1', body: 'Doors at 7pm' }));
  assert.equal(admin.last('sent').message.kind, 'ANNOUNCEMENT');
  assert.deepEqual(pushes.at(-1).targets.map((t) => t.userId), ['sam']);
  assert.equal(pushes.at(-1).msg.title, '📣 Lodge Social: January');
});
