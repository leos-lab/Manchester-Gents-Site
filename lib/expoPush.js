// Push notifications to the Manchester Gents app via Expo's push service
// (delivers to iOS via APNs and Android via FCM). Server-side only.
import prisma from './prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// messages: [{ userId? , to?, title, body, data }]. Returns how many devices got it.
async function deliver(messages) {
  let delivered = 0;
  const dead = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {})
        },
        body: JSON.stringify(batch.map(({ to, title, body, data }) => ({ to, title, body, data, sound: 'default', channelId: 'chat' })))
      });
      const json = await res.json().catch(() => ({}));
      (json.data || []).forEach((ticket, idx) => {
        if (ticket?.status === 'ok') delivered += 1;
        else if (ticket?.details?.error === 'DeviceNotRegistered') dead.push(batch[idx].to);
      });
    } catch (error) {
      console.error('Expo push failed', error);
    }
  }
  if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
  return delivered;
}

export async function pushToUsers(userIds, { title, body, data }) {
  if (!userIds.length) return 0;
  const tokens = await prisma.pushToken.findMany({ where: { userId: { in: userIds } }, select: { token: true } });
  return deliver(tokens.map((t) => ({ to: t.token, title, body, data })));
}

export async function hasPushToken(userId) {
  return (await prisma.pushToken.count({ where: { userId } })) > 0;
}
