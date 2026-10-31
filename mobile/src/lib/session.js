import * as SecureStore from 'expo-secure-store';

// The app token lives in the iOS Keychain / Android Keystore.
const TOKEN_KEY = 'mg.session.token';
const USER_KEY = 'mg.session.user';
const CHAT_URL_KEY = 'mg.session.chatUrl';

export async function loadSession() {
  const [token, user, chatUrl] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
    SecureStore.getItemAsync(CHAT_URL_KEY)
  ]);
  if (!token) return null;
  try {
    return { token, user: user ? JSON.parse(user) : null, chatUrl: chatUrl || null };
  } catch {
    return { token, user: null, chatUrl: chatUrl || null };
  }
}

export async function saveSession({ token, user, chatUrl }) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user ?? null));
  if (chatUrl) await SecureStore.setItemAsync(CHAT_URL_KEY, chatUrl);
}

export async function saveUser(user) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user ?? null));
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(CHAT_URL_KEY)
  ]);
}
