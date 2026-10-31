// Member fields the app's admin screens show (admins only: includes contact
// details and the private reference photo).
import { getDisplayName } from './displayName';
import { photoSrc } from './memberPhotoRef';

export const ADMIN_MEMBER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  preferredName: true,
  shareFirstName: true,
  name: true,
  instagramHandle: true,
  email: true,
  phoneNumber: true,
  preferredContactMethod: true,
  avatarUrl: true,
  profilePhotoUrl: true,
  profilePhotoOriginalUrl: true,
  role: true,
  isPlaceholder: true,
  chatBannedAt: true,
  createdAt: true
};

export function toAdminMember(user, extra = {}) {
  return {
    id: user.id,
    name: getDisplayName(user),
    firstName: user.firstName,
    lastName: user.lastName,
    preferredName: user.preferredName,
    shareFirstName: user.shareFirstName,
    instagramHandle: user.instagramHandle || null,
    email: user.isPlaceholder ? null : user.email,
    phoneNumber: user.phoneNumber || null,
    preferredContactMethod: user.preferredContactMethod || null,
    avatarUrl: user.avatarUrl || null,
    referencePhotoUrl: photoSrc(user.profilePhotoUrl, 'medium'),
    referenceThumbUrl: photoSrc(user.profilePhotoUrl, 'thumb'),
    // The full, uncropped photo they uploaded.
    referenceFullUrl: photoSrc(user.profilePhotoOriginalUrl || user.profilePhotoUrl, 'original'),
    isAdmin: user.role === 'ADMIN',
    isPlaceholder: user.isPlaceholder,
    chatBanned: Boolean(user.chatBannedAt),
    memberSince: user.createdAt,
    ...extra
  };
}
