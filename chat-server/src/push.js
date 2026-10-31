// Expo push notifications. Works for both iOS (APNs) and Android (FCM) once the
// app's credentials are configured in EAS; no Apple/Google keys live here.
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export function createPusher({ store, accessToken, log = console }) {
  return async function sendPush(targets, { title, body, data, threadId }) {
    const byToken = new Map(targets.map((t) => [t.token, t]));
    const tokens = [...byToken.keys()];
    const dead = [];
    for (let i = 0; i < tokens.length; i += 100) {
      const batch = tokens.slice(i, i + 100).map((to) => ({
        to,
        title,
        body,
        data,
        sound: 'default',
        // Groups each event's messages together in Notification Centre.
        threadId,
        channelId: 'chat'
      }));
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify(batch)
        });
        const json = await res.json().catch(() => ({}));
        (json.data || []).forEach((ticket, idx) => {
          if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            dead.push(batch[idx].to);
          }
        });
      } catch (error) {
        log.error('push batch failed', error?.message || error);
      }
    }
    if (dead.length) await store.deletePushTokens(dead);
  };
}
