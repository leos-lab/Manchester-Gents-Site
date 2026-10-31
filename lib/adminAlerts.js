// Push alerts to admins' phones for things that need a look: RSVPs and
// cancellations, new member sign-ups. (Chat reports are pushed by the chat
// server.) Never throws: an alert failing must not fail the member's action.
import prisma from './prisma';
import { pushToUsers } from './expoPush';

export async function notifyAdmins({ title, body, path }) {
  try {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    await pushToUsers(
      admins.map((a) => a.id),
      { title, body, data: { path } }
    );
  } catch (error) {
    console.error('Admin alert failed', error);
  }
}
