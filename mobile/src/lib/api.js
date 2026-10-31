// Client for the website's /api/v1 (see documentation/app-api.md).
import { API_URL } from '../config';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let authToken = null;
let onUnauthorized = null;

export function setAuthToken(token) {
  authToken = token;
}

// Called when the server says the session is no longer valid (e.g. an admin
// logged everyone out), so the app can return to sign-in.
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function request(path, { method = 'GET', body, form, token = authToken, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal
    });
  } catch {
    throw new ApiError('Can’t reach Manchester Gents. Check your connection.', 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(json.error || 'Something went wrong.', res.status);
  }
  return json;
}

const enc = encodeURIComponent;

export const api = {
  login: (identifier, password) =>
    request('/api/v1/auth/login', { method: 'POST', body: { identifier, password }, token: null }),
  me: () => request('/api/v1/me'),
  updateMe: (changes) => request('/api/v1/me', { method: 'PATCH', body: changes }),
  deleteAccount: (password) => request('/api/v1/me', { method: 'DELETE', body: { password } }),

  events: (scope = 'upcoming') => request(`/api/v1/events?scope=${enc(scope)}`),
  event: (id) => request(`/api/v1/events/${enc(id)}`),
  rsvp: (id, specialRequests) =>
    request(`/api/v1/events/${enc(id)}/rsvp`, { method: 'POST', body: { specialRequests: specialRequests || null } }),
  cancelRsvp: (id) => request(`/api/v1/events/${enc(id)}/rsvp`, { method: 'DELETE' }),

  member: (id) => request(`/api/v1/members/${enc(id)}`),

  registerPushToken: (token, platform) =>
    request('/api/v1/push-tokens', { method: 'POST', body: { token, platform } }),
  removePushToken: (token) => request('/api/v1/push-tokens', { method: 'DELETE', body: { token } }),

  // Avatar: get a direct-upload target, send the image to Pinstripe, then confirm.
  avatarUploadTarget: () => request('/api/v1/me/avatar', { method: 'POST' }),
  setAvatar: (photoId) => request('/api/v1/me/avatar', { method: 'PUT', body: { photoId } }),
  removeAvatar: () => request('/api/v1/me/avatar', { method: 'DELETE' })
};

// Uploads a picked image straight to Pinstripe using the target from the API.
export async function uploadToPinstripe(target, { uri, mimeType = 'image/jpeg', fileName = 'avatar.jpg' }) {
  const form = new FormData();
  form.append('kind', target.kind);
  form.append(target.field || 'file', { uri, type: mimeType, name: fileName });
  let res;
  try {
    res = await fetch(target.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${target.token}` },
      body: form
    });
  } catch {
    throw new ApiError('Upload failed. Check your connection.', 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new ApiError(json.error || 'Upload failed.', res.status);
  return json.data;
}
