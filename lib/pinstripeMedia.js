// Server-only: member photos in Pinstripe (avatars + private reference photos).
// Tokens are signed with a key derived from PINSTRIPE_MANAGEMENT_TOKEN.
// Keep in sync with Pinstripe-API src/lib/mediaTokens.js.
import crypto from 'node:crypto';
import { PINSTRIPE_SITE_SLUG } from './pinstripe';

const KEY_CONTEXT = 'pinstripe-member-media-v1';

export function pinstripeApiBase() {
  return (process.env.PINSTRIPE_API_URL || process.env.NEXT_PUBLIC_PINSTRIPE_API_URL || '').replace(/\/+$/, '');
}

function managementToken() {
  const token = process.env.PINSTRIPE_MANAGEMENT_TOKEN || process.env.API_TOKEN;
  if (!token || !pinstripeApiBase()) {
    const err = new Error('Pinstripe is not configured (PINSTRIPE_API_URL / PINSTRIPE_MANAGEMENT_TOKEN).');
    err.status = 503;
    throw err;
  }
  return token;
}

export function signMediaToken(claims) {
  const key = crypto.createHmac('sha256', managementToken()).update(KEY_CONTEXT).digest();
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sig = crypto.createHmac('sha256', key).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

// Direct-upload details for a client (app or browser) to send one photo to Pinstripe.
export function memberUploadTarget(memberRef, kind, ttlSeconds = 15 * 60) {
  return {
    url: `${pinstripeApiBase()}/api/sites/${encodeURIComponent(PINSTRIPE_SITE_SLUG)}/members/${encodeURIComponent(memberRef)}/photos`,
    token: signMediaToken({
      p: 'member-upload',
      site: PINSTRIPE_SITE_SLUG,
      member: memberRef,
      kind,
      exp: Date.now() + ttlSeconds * 1000
    }),
    kind,
    field: 'file'
  };
}

// Short-lived URL that serves the photo straight from Pinstripe's disk.
export function memberPhotoFileUrl(photoId, variant = 'display', ttlSeconds = 10 * 60) {
  const token = signMediaToken({ p: 'member-view', id: photoId, v: variant, exp: Date.now() + ttlSeconds * 1000 });
  return `${pinstripeApiBase()}/api/member-photos/${encodeURIComponent(photoId)}/file?t=${token}`;
}

async function manage(path, init = {}) {
  const res = await fetch(`${pinstripeApiBase()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${managementToken()}`, ...(init.headers || {}) },
    cache: 'no-store'
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.error || `Pinstripe request failed (${res.status})`);
    err.status = res.status === 404 ? 404 : 502;
    throw err;
  }
  return json?.data;
}

export function getMemberPhoto(photoId) {
  return manage(`/api/member-photos/${encodeURIComponent(photoId)}`);
}

export function reassignMemberPhoto(photoId, memberRef) {
  return manage(`/api/member-photos/${encodeURIComponent(photoId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberRef })
  });
}

export function deleteMemberPhoto(photoId) {
  return manage(`/api/member-photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
}

export function deleteAllMemberPhotos(memberRef) {
  return manage(
    `/api/sites/${encodeURIComponent(PINSTRIPE_SITE_SLUG)}/members/${encodeURIComponent(memberRef)}`,
    { method: 'DELETE' }
  );
}

// Server-side upload (used by the website's photo route and the migration script).
export async function uploadMemberPhoto(memberRef, kind, { buffer, filename, mimeType }) {
  const form = new FormData();
  form.append('kind', kind);
  form.append('file', new Blob([buffer], { type: mimeType }), filename);
  return manage(
    `/api/sites/${encodeURIComponent(PINSTRIPE_SITE_SLUG)}/members/${encodeURIComponent(memberRef)}/photos`,
    { method: 'POST', body: form }
  );
}
