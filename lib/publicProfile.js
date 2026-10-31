import { getDisplayName } from './displayName';

// What other members may see. Never includes email, phone, consents or the
// private reference photo (profilePhotoUrl).
export const PUBLIC_MEMBER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  preferredName: true,
  shareFirstName: true,
  name: true,
  instagramHandle: true,
  avatarUrl: true,
  bio: true,
  role: true,
  createdAt: true
};

export function toPublicMember(user, extra = {}) {
  const handle = user.instagramHandle?.replace(/^@/, '') || null;
  return {
    id: user.id,
    name: getDisplayName(user),
    avatarUrl: user.avatarUrl || null,
    bio: user.bio || null,
    isAdmin: user.role === 'ADMIN',
    memberSince: user.createdAt,
    instagram: handle ? { handle, url: `https://instagram.com/${encodeURIComponent(handle)}` } : null,
    ...extra
  };
}

export function eventsAttendedWhere(userId) {
  return { userId, status: 'CONFIRMED', event: { startTime: { lt: new Date() } } };
}
