// Client for the website's /api/v1 (see documentation/app-api.md).
import { API_URL } from '../config';
import { filePart } from './filePart';

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
  gallery: (id, { assets = false } = {}) => request(`/api/v1/events/${enc(id)}/gallery${assets ? '?assets=1' : ''}`),

  member: (id) => request(`/api/v1/members/${enc(id)}`),
  searchMembers: (q) => request(`/api/v1/members?q=${enc(q)}`),

  registerPushToken: (token, platform) =>
    request('/api/v1/push-tokens', { method: 'POST', body: { token, platform } }),
  removePushToken: (token) => request('/api/v1/push-tokens', { method: 'DELETE', body: { token } }),

  // Avatar: get a direct-upload target, send the image to Pinstripe, then confirm.
  avatarUploadTarget: () => request('/api/v1/me/avatar', { method: 'POST' }),
  setAvatar: (photoId) => request('/api/v1/me/avatar', { method: 'PUT', body: { photoId } }),
  removeAvatar: () => request('/api/v1/me/avatar', { method: 'DELETE' }),

  notifications: () => request('/api/v1/notifications'),
  markNotificationsRead: (ids) =>
    request('/api/v1/notifications', { method: 'POST', body: ids ? { ids } : { all: true } }),

  // Guidelines, privacy policy, photography notice, welcome-screen covers.
  content: () => request('/api/v1/content', { token: null }),

  // Joining: the private reference photo is uploaded first (multipart), then
  // the account is created with the same fields as the website's form.
  uploadReferencePhoto: (asset) => {
    const form = new FormData();
    form.append('file', filePart(asset));
    form.append('variant', 'original');
    return request('/api/profile/photo', { method: 'POST', form });
  },
  // A photo for a chat message: returns { imageUrl } to send with it.
  uploadChatImage: (asset) => {
    const form = new FormData();
    form.append('file', filePart(asset));
    return request('/api/v1/chat/images', { method: 'POST', form });
  },
  // A group or community chat's picture (group admins / site admins).
  setChatPhoto: (roomId, asset) => {
    const form = new FormData();
    form.append('file', filePart(asset));
    return request(`/api/v1/chat/rooms/${enc(roomId)}/photo`, { method: 'POST', form });
  },
  removeChatPhoto: (roomId) => request(`/api/v1/chat/rooms/${enc(roomId)}/photo`, { method: 'DELETE' }),
  register: (details) => request('/api/register', { method: 'POST', body: details, token: null }),
  forgotPassword: (identifier) =>
    request('/api/auth/forgot-password', { method: 'POST', body: { identifier }, token: null }),

  // Admin: reads come from /api/v1/admin, changes go through the website's
  // existing admin routes (they accept the app token too).
  admin: {
    overview: () => request('/api/v1/admin/overview'),
    events: () => request('/api/v1/admin/events'),
    event: (id) => request(`/api/v1/admin/events/${enc(id)}`),
    createEvent: (fields) => request('/api/events', { method: 'POST', body: fields }),
    updateEvent: (id, fields) => request(`/api/events/${enc(id)}`, { method: 'PUT', body: fields }),
    deleteEvent: (id) => request(`/api/events/${enc(id)}`, { method: 'DELETE' }),
    setCover: (id, coverImageUrl, coverFocus = null) =>
      request(`/api/events/${enc(id)}/cover`, { method: 'PATCH', body: { coverImageUrl, coverFocus } }),
    addGuests: (id, userIds) => request(`/api/admin/events/${enc(id)}/attendees`, { method: 'POST', body: { userIds } }),
    addGuestByHandle: (id, instagramHandle) =>
      request(`/api/admin/events/${enc(id)}/attendees`, { method: 'POST', body: { instagramHandle } }),
    removeGuest: (id, userId) => request(`/api/admin/events/${enc(id)}/attendees/${enc(userId)}`, { method: 'DELETE' }),

    members: (q = '', { placeholders = false } = {}) =>
      request(`/api/v1/admin/members?q=${enc(q)}${placeholders ? '&placeholders=1' : ''}`),
    member: (id) => request(`/api/v1/admin/members/${enc(id)}`),
    updateMember: (id, fields) => request(`/api/admin/members/${enc(id)}`, { method: 'PATCH', body: fields }),
    resetLink: (id) => request(`/api/admin/members/${enc(id)}/reset-link`, { method: 'POST' }),
    deleteMember: (id) => request(`/api/admin/members/${enc(id)}`, { method: 'DELETE' }),
    unbanFromChat: (id) => request(`/api/admin/members/${enc(id)}/chat-ban`, { method: 'DELETE' }),
    addPlaceholders: (users) => request('/api/admin/placeholders', { method: 'POST', body: { users } }),

    reports: () => request('/api/v1/admin/reports'),
    actOnReport: (reportId, action) =>
      request(`/api/admin/chat-reports/${enc(reportId)}`, { method: 'POST', body: { action } }),

    reminders: () => request('/api/v1/admin/reminders'),
    sendReminder: (eventId, userId) =>
      request('/api/admin/rsvp-reminders/send', { method: 'POST', body: { eventId, userId } }),

    announcements: () => request('/api/v1/admin/announcements'),
    announce: (announcement) => request('/api/v1/admin/announcements', { method: 'POST', body: announcement }),
    settings: () => request('/api/v1/admin/settings'),
    setComingSoon: (enabled, disableAt = null) =>
      request('/api/admin/coming-soon', { method: 'POST', body: { enabled, disableAt } }),
    setPhotoNotice: (enabled) => request('/api/admin/photo-notice', { method: 'POST', body: { enabled } }),
    signEveryoneOut: () => request('/api/admin/sessions/invalidate', { method: 'POST' })
  }
};

// Private photos (reference photos) are served by the website only to the
// member and admins, so the image request carries the app token.
export function privateImage(path) {
  if (!path) return null;
  return { uri: `${API_URL}${path}`, headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined };
}

// Uploads a picked image straight to Pinstripe using the target from the API.
export async function uploadToPinstripe(target, { uri, mimeType = 'image/jpeg', fileName = 'avatar.jpg' }) {
  const form = new FormData();
  form.append('kind', target.kind);
  form.append(target.field || 'file', filePart({ uri, mimeType, fileName }));
  let res;
  try {
    res = await fetch(target.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${target.token}` },
      body: form
    });
  } catch (error) {
    console.warn('Pinstripe upload failed', target.url, error);
    throw new ApiError(`Upload failed (${error?.message || 'network error'}). Check your connection.`, 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new ApiError(json.error || 'Upload failed.', res.status);
  return json.data;
}
