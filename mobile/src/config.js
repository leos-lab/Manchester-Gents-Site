import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_URL = String(extra.apiUrl || 'https://manchestergents.com').replace(/\/+$/, '');
// The login response also returns chatUrl; this is the fallback.
export const CHAT_URL = extra.chatUrl || null;
export const EAS_PROJECT_ID = extra.eas?.projectId || Constants.easConfig?.projectId || null;
