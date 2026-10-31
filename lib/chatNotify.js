import prisma from './prisma';

// Tells the chat server about changes made on the website (it LISTENs on the
// same Postgres channel as the membership trigger).
export async function notifyChat(payload) {
  await prisma.$executeRaw`SELECT pg_notify('mg_chat', ${JSON.stringify(payload)})`;
}
