import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ChatHub } from '../src/hub.js';
import { createStore } from '../src/store.js';
import { signChatToken, verifyChatToken } from '../src/token.js';
import { createShimPool } from './pgShim.js';

// TEST_DATABASE_URL runs against the real pg driver. Every test truncates the
// chat, user and event tables, so point it at a throwaway database branch only.
const TEST_URL = process.env.TEST_DATABASE_URL;
const PG = { host: process.env.PGHOST || '/home/claude/.pgtest', port: 5433, db: 'mg' };
const SECRET = 'test-secret';
const pool = TEST_URL
  ? new (await import('pg')).default.Pool({ connectionString: TEST_URL, max: 4 })
  : createShimPool(PG);
after(() => pool.end?.());

// Runs raw SQL and returns the first column of the last row, like psql -A -t.
async function sql(q) {
  if (!TEST_URL) return execFileSync('psql', ['-X', '-q', '-A', '-t', '-h', PG.host, '-p', String(PG.port), '-U', 'postgres', PG.db, '-c', q]).toString().trim();
  const row = [].concat(await pool.query(q)).at(-1).rows?.at(-1);
  return row ? String(Object.values(row)[0]) : '';
}

function seed() {
  return sql(`TRUNCATE "User", "Event", "GlobalSetting", "ChatRoom" CASCADE;
    INSERT INTO "GlobalSetting" ("key","value","updatedAt") VALUES ('sessionVersion','7',now());
    INSERT INTO "User" ("id","email","passwordHash","instagramHandle","firstName","lastName","shareFirstName","role","updatedAt") VALUES
      ('admin','a@x','x','manchester.gents','Leo','L',true,'ADMIN',now()),
      ('alex','b@x','x','alex','Alex','Smith',false,'MEMBER',now()),
      ('sam','c@x','x','sam','Sam',NULL,false,'MEMBER',now()),
      ('outsider','d@x','x','out','Olly',NULL,false,'MEMBER',now());
    INSERT INTO "Event" ("id","slug","title","startTime","updatedAt") VALUES ('ev1','lodge-jan','Lodge Social: January','2027-01-20 19:00',now());
    INSERT INTO "EventSignup" ("id","userId","eventId") VALUES ('s1','alex','ev1'),('s2','sam','ev1');
    INSERT INTO "PushToken" ("id","userId","token","platform","updatedAt") VALUES
      ('p1','sam','ExponentPushToken[sam]','ios',now()),
      ('p2','outsider','ExponentPushToken[olly]','android',now());`);
}

function fakeConn() {
  const inbox = [];
  return { inbox, send: (m) => inbox.push(m), close() {}, last: (t) => [...inbox].reverse().find((m) => m.type === t) };
}

async function setup() {
  await seed();
  const pushes = [];
  const store = createStore(pool);
  const hub = new ChatHub({ store, secret: SECRET, sendPush: async (targets, msg) => pushes.push({ targets, msg }), log: { error: (...a) => { throw new Error(a.join(' ')); } } });
  const connect = async (userId, sv = '7') => {
    const c = fakeConn();
    hub.attach(c);
    await hub.handle(c, JSON.stringify({ type: 'auth', token: signChatToken({ sub: userId, sv }, SECRET, 60) }));
    return c;
  };
  const say = (c, msg) => hub.handle(c, JSON.stringify(msg));
  return { hub, store, pushes, connect, say };
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
  assert.equal((await connect('alex', '6')).last('error').code, 'bad_token');
});

test('event chat: RSVPed members only, offline members get a push, unread counts', async () => {
  const { connect, say, pushes } = await setup();
  const alex = await connect('alex');
  assert.equal(alex.last('ready').user.name, 'Alex');
  const outsider = await connect('outsider');

  await say(outsider, { type: 'join', eventId: 'ev1' });
  assert.equal(outsider.last('error').code, 'forbidden');

  await say(alex, { type: 'join', eventId: 'ev1' });
  const joined = alex.last('joined');
  assert.equal(joined.kind, 'EVENT');
  assert.equal(joined.title, 'Lodge Social: January');
  const roomId = joined.roomId;

  await say(alex, { type: 'send', roomId, clientId: 'c1', body: 'Evening all' });
  assert.equal(alex.last('sent').message.sender.name, 'Alex');
  await say(alex, { type: 'send', roomId, clientId: 'c1', body: 'Evening all' }); // retry
  assert.equal(pushes.length, 1, 'retry is not duplicated');
  assert.deepEqual(pushes[0].targets.map((t) => t.userId), ['sam']);
  assert.equal(pushes[0].msg.body, 'Alex: Evening all');

  const sam = await connect('sam');
  await say(sam, { type: 'join', roomId });
  assert.equal(sam.last('joined').messages.length, 1);
  await say(alex, { type: 'send', roomId, clientId: 'c2', body: 'See you there' });
  assert.equal(sam.last('message').message.body, 'See you there');
  assert.equal(pushes.length, 1, 'no push to someone already in the room');

  const eventRoom = () => sam.last('rooms').rooms.find((r) => r.id === roomId);
  await say(sam, { type: 'rooms' });
  assert.equal(eventRoom().unread, 2);
  await say(sam, { type: 'read', roomId });
  await say(sam, { type: 'rooms' });
  assert.equal(eventRoom().unread, 0);
});

test('DMs: anyone can message anyone, private from admins, block stops it', async () => {
  const { connect, say, pushes } = await setup();
  const alex = await connect('alex');
  const admin = await connect('admin');

  // Olly hasn't been to an event with Alex; DMs are open to all members.
  await say(alex, { type: 'dm', userId: 'outsider' });
  const dm = alex.last('joined');
  assert.equal(dm.kind, 'DIRECT');
  assert.equal(dm.otherUserId, 'outsider');
  await say(alex, { type: 'send', roomId: dm.roomId, clientId: 'd1', body: 'Fancy a pint before the social?' });
  assert.equal(pushes.at(-1).msg.title, 'Alex');
  assert.equal(pushes.at(-1).msg.body, 'Fancy a pint before the social?');
  assert.deepEqual(pushes.at(-1).targets.map((t) => t.userId), ['outsider']);

  // Same pair -> same room, from either side.
  const olly = await connect('outsider');
  await say(olly, { type: 'dm', userId: 'alex' });
  assert.equal(olly.last('joined').roomId, dm.roomId);
  await say(olly, { type: 'rooms' });
  const listed = olly.last('rooms').rooms.find((r) => r.kind === 'DIRECT');
  assert.equal(listed.title, 'Alex');
  assert.equal(listed.unread, 1);

  // Admins can't read other people's DMs.
  await say(admin, { type: 'join', roomId: dm.roomId });
  assert.equal(admin.last('error').code, 'forbidden');

  // Can't DM yourself.
  await say(alex, { type: 'dm', userId: 'alex' });
  assert.equal(alex.last('error').code, 'not_found');

  // Olly blocks Alex: neither can post in the DM any more.
  await say(olly, { type: 'block', userId: 'alex' });
  await say(alex, { type: 'send', roomId: dm.roomId, clientId: 'd2', body: 'hello?' });
  assert.equal(alex.last('error').code, 'forbidden');
  await say(olly, { type: 'send', roomId: dm.roomId, clientId: 'd3', body: 'hi' });
  assert.equal(olly.last('error').code, 'forbidden');
});

test('moderation: report, block hides messages, admin delete, RSVP cancel removes access', async () => {
  const { hub, connect, say, store } = await setup();
  const alex = await connect('alex');
  const sam = await connect('sam');
  for (const c of [alex, sam]) await say(c, { type: 'join', eventId: 'ev1' });
  const roomId = alex.last('joined').roomId;

  await say(alex, { type: 'send', roomId, clientId: 'x1', body: 'rude' });
  const msgId = alex.last('sent').message.id;
  await say(sam, { type: 'report', messageId: msgId, reason: 'rude' });
  assert.equal(await sql(`SELECT count(*) FROM "ChatReport"`), '1');

  await say(sam, { type: 'block', userId: 'alex' });
  const before = sam.inbox.length;
  await say(alex, { type: 'send', roomId, clientId: 'x2', body: 'hello?' });
  assert.equal(sam.inbox.length, before, 'blocked sender is hidden in group chats');

  const admin = await connect('admin');
  await say(admin, { type: 'delete', messageId: msgId });
  assert.equal(alex.last('deleted').messageId, msgId);
  assert.equal((await store.history(roomId)).find((m) => m.id === msgId).body, null);

  await sql(`DELETE FROM "EventSignup" WHERE "id" = 's1'`);
  await hub.onMembershipChange({ eventId: 'ev1', userId: 'alex', op: 'DELETE' });
  assert.equal(alex.last('removed').roomId, roomId);
  await say(alex, { type: 'send', roomId, clientId: 'x3', body: 'still here?' });
  assert.equal(alex.last('error').code, 'forbidden');
});

test('announcements: admin only, event chats only, reach muted members', async () => {
  const { connect, say, pushes } = await setup();
  const sam = await connect('sam');
  await say(sam, { type: 'join', eventId: 'ev1' });
  const roomId = sam.last('joined').roomId;
  await say(sam, { type: 'mute', roomId, muted: true });
  await say(sam, { type: 'leave', roomId });

  const alex = await connect('alex');
  await say(alex, { type: 'announce', roomId, body: 'nope' });
  assert.equal(alex.last('error').code, 'forbidden');
  await say(alex, { type: 'send', roomId, clientId: 'n1', body: 'normal message' });
  assert.equal(pushes.length, 0, 'muted member gets no push for normal messages');

  const admin = await connect('admin');
  await say(admin, { type: 'announce', roomId, clientId: 'a1', body: 'Doors at 7pm' });
  assert.equal(admin.last('sent').message.kind, 'ANNOUNCEMENT');
  assert.deepEqual(pushes.at(-1).targets.map((t) => t.userId).sort(), ['sam']);
  assert.equal(pushes.at(-1).msg.title, '📣 Lodge Social: January');
});

test('website moderation: deleted message broadcast live, ban applies to open connections', async () => {
  const { hub, connect, say } = await setup();
  const alex = await connect('alex');
  const sam = await connect('sam');
  for (const c of [alex, sam]) await say(c, { type: 'join', eventId: 'ev1' });
  const roomId = alex.last('joined').roomId;
  await say(alex, { type: 'send', roomId, clientId: 'm1', body: 'not nice' });
  const messageId = alex.last('sent').message.id;

  hub.onMessageDeleted({ roomId, messageId });
  assert.equal(sam.last('deleted').messageId, messageId);

  await sql(`UPDATE "User" SET "chatBannedAt" = now() WHERE "id" = 'alex'`);
  await hub.onUserChanged({ userId: 'alex' });
  await say(alex, { type: 'send', roomId, clientId: 'm2', body: 'hello?' });
  assert.equal(alex.last('error').code, 'forbidden');

  await sql(`UPDATE "User" SET "chatBannedAt" = NULL WHERE "id" = 'alex'`);
  await hub.onUserChanged({ userId: 'alex' });
  await say(alex, { type: 'send', roomId, clientId: 'm3', body: 'sorry all' });
  assert.equal(alex.last('sent').message.body, 'sorry all');
});

test('reports alert admins without quoting the message', async () => {
  const { connect, say, pushes } = await setup();
  await sql(`INSERT INTO "PushToken" ("id","userId","token","platform","updatedAt") VALUES ('p3','admin','ExponentPushToken[leo]','ios',now())`);
  const alex = await connect('alex');
  const sam = await connect('sam');
  for (const c of [alex, sam]) await say(c, { type: 'join', eventId: 'ev1' });
  const roomId = alex.last('joined').roomId;
  await say(alex, { type: 'send', roomId, clientId: 'r1', body: 'something private' });
  await say(sam, { type: 'report', messageId: alex.last('sent').message.id, reason: 'rude' });
  await new Promise((r) => setImmediate(r));
  const alert = pushes.at(-1);
  assert.deepEqual(alert.targets.map((t) => t.userId), ['admin']);
  assert.equal(alert.msg.title, 'Message reported');
  assert.equal(alert.msg.body, 'Reason: rude');
  assert.ok(!JSON.stringify(alert.msg).includes('something private'));
  assert.equal(alert.msg.data.path, '/admin/reports');
});

test('community chat: every member, listed first, no push except announcements', async () => {
  const { connect, say, pushes, hub } = await setup();
  const outsider = await connect('outsider');
  await say(outsider, { type: 'rooms' });
  assert.equal(outsider.last('rooms').rooms[0].kind, 'COMMUNITY');
  await say(outsider, { type: 'join', roomId: 'community' });
  assert.equal(outsider.last('joined').title, 'Community');
  const alex = await connect('alex');
  await say(alex, { type: 'join', roomId: 'community' });
  await say(alex, { type: 'send', roomId: 'community', clientId: 'c1', body: 'Anyone for a pint?' });
  assert.equal(outsider.last('message').message.body, 'Anyone for a pint?');
  assert.equal(pushes.length, 0, 'ordinary community messages do not push');

  // An announcement posted by the website arrives live.
  await sql(`INSERT INTO "ChatMessage" ("id","roomId","userId","kind","body") VALUES ('ann1','community','admin','ANNOUNCEMENT','Doors at 7')`);
  await hub.onMessageCreated({ roomId: 'community', messageId: 'ann1' });
  assert.equal(outsider.last('message').message.kind, 'ANNOUNCEMENT');
});

test('locations and private photos in DMs', async () => {
  const { connect, say } = await setup();
  const alex = await connect('alex');
  await say(alex, { type: 'dm', userId: 'sam' });
  const roomId = alex.last('joined').roomId;
  await say(alex, { type: 'send', roomId, clientId: 'l1', location: { latitude: 53.4794, longitude: -2.2453, name: 'The Lodge' } });
  const sent = alex.last('sent').message;
  assert.equal(sent.kind, 'LOCATION');
  assert.deepEqual(sent.location, { latitude: 53.4794, longitude: -2.2453, name: 'The Lodge' });
  await say(alex, { type: 'send', roomId, clientId: 'l2', location: { latitude: 999, longitude: 0 } });
  assert.equal(alex.last('error').code, 'empty');
  await say(alex, { type: 'send', roomId, clientId: 'p1', imageUrl: 'pinstripe:abc123' });
  assert.equal(alex.last('sent').message.kind, 'IMAGE');
  await say(alex, { type: 'send', roomId, clientId: 'p2', imageUrl: 'javascript:alert(1)' });
  assert.equal(alex.last('error').code, 'empty');
});

test('event chats are listed before anyone posts and close 48h after the event', async () => {
  const { connect, say } = await setup();
  const sam = await connect('sam');
  await say(sam, { type: 'rooms' });
  assert.ok(sam.last('rooms').rooms.some((r) => r.kind === 'EVENT' && r.eventId === 'ev1' && !r.closed));

  await sql(`INSERT INTO "Event" ("id","slug","title","startTime","endTime","updatedAt") VALUES ('old','old','Old social', now() - interval '4 days', now() - interval '3 days', now());
             INSERT INTO "EventSignup" ("id","userId","eventId") VALUES ('s9','sam','old')`);
  await say(sam, { type: 'join', eventId: 'old' });
  const joined = sam.last('joined');
  assert.equal(joined.closed, true);
  assert.equal(joined.canPost, false);
  await say(sam, { type: 'send', roomId: joined.roomId, clientId: 'x', body: 'still here?' });
  assert.equal(sam.last('error').code, 'forbidden');
});

test('a password reset signs out only that member', async () => {
  const { connect, hub } = await setup();
  await sql(`UPDATE "User" SET "sessionVersion" = 1 WHERE "id" = 'alex'`);
  assert.equal((await connect('alex')).last('error').code, 'bad_token', 'old token rejected');
  assert.ok((await connect('sam')).last('ready'), 'other members unaffected');
  const c = fakeConn();
  hub.attach(c);
  await hub.handle(c, JSON.stringify({ type: 'auth', token: signChatToken({ sub: 'alex', sv: '7', uv: 1 }, SECRET, 60) }));
  assert.ok(c.last('ready'), 'new token after the reset works');
});
