// Manchester Gents chat server: WebSockets + Postgres, built to run on a home server.
import http from 'node:http';
import pg from 'pg';
import { WebSocketServer } from 'ws';
import { ChatHub } from './hub.js';
import { createStore } from './store.js';
import { createPusher } from './push.js';

const {
  DATABASE_URL,
  CHAT_TOKEN_SECRET,
  EXPO_ACCESS_TOKEN,
  PORT = '8080',
  ALLOWED_ORIGINS = ''
} = process.env;

if (!DATABASE_URL || !CHAT_TOKEN_SECRET) {
  console.error('DATABASE_URL and CHAT_TOKEN_SECRET are required.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });
const store = createStore(pool);
const sendPush = createPusher({ store, accessToken: EXPO_ACCESS_TOKEN });
const hub = new ChatHub({ store, sendPush, secret: CHAT_TOKEN_SECRET });
const origins = ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

// Membership changes come from a trigger on EventSignup. LISTEN needs a direct
// (non-pooled) connection; reconnect if it drops.
async function listen() {
  const client = new pg.Client({ connectionString: process.env.DIRECT_DATABASE_URL || DATABASE_URL });
  client.on('error', (e) => {
    console.error('listen connection lost', e.message);
    setTimeout(listen, 3000);
  });
  client.on('notification', (n) => {
    try {
      const payload = JSON.parse(n.payload);
      if (payload.type === 'membership') hub.onMembershipChange(payload);
      else if (payload.type === 'message_deleted') hub.onMessageDeleted(payload);
      else if (payload.type === 'message_created') hub.onMessageCreated(payload).catch((e) => console.error(e));
      else if (payload.type === 'user_changed') hub.onUserChanged(payload).catch((e) => console.error(e));
    } catch (e) {
      console.error('bad notification', e);
    }
  });
  try {
    await client.connect();
    await client.query('LISTEN mg_chat');
    console.log('listening for membership changes');
  } catch (e) {
    console.error('listen failed', e.message);
    client.end().catch(() => {});
    setTimeout(listen, 3000);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    pool.query('SELECT 1')
      .then(() => { res.writeHead(200); res.end('ok'); })
      .catch(() => { res.writeHead(503); res.end('db down'); });
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 64 * 1024,
  // Browsers must be on the allow-list. Native apps send no Origin, except
  // iOS, whose WebSocket sends the chat server's own address; no web page is
  // served from here, so that origin is the app too.
  verifyClient: ({ origin, req }) =>
    !origin ||
    origins.length === 0 ||
    origins.includes(origin) ||
    origin === `https://${req.headers['x-forwarded-host'] || req.headers.host}`
});

wss.on('connection', (socket) => {
  const conn = {
    send: (obj) => socket.readyState === socket.OPEN && socket.send(JSON.stringify(obj)),
    close: () => socket.close()
  };
  hub.attach(conn);
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });
  // Unauthenticated sockets get 10 seconds to send auth.
  const authTimer = setTimeout(() => { if (!conn.state.user) socket.close(4001, 'auth timeout'); }, 10_000);
  socket.on('message', (data) => hub.handle(conn, data.toString()));
  socket.on('close', () => { clearTimeout(authTimer); hub.detach(conn); });
});

// Drop dead connections (phones that lost signal) every 30s.
setInterval(() => {
  for (const socket of wss.clients) {
    if (!socket.isAlive) { socket.terminate(); continue; }
    socket.isAlive = false;
    socket.ping();
  }
}, 30_000);

listen();
server.listen(Number(PORT), () => console.log(`chat server on :${PORT}`));

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    wss.close();
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
