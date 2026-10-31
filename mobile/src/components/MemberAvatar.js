import { Avatar } from './Avatar';
import { privateImage } from '../lib/api';

// Admin screens: a member's public avatar, or their private reference photo
// if they haven't set one (admins can see reference photos).
export function MemberAvatar({ member, size = 40, ring }) {
  const fallback = !member.avatarUrl && member.referenceThumbUrl ? privateImage(member.referenceThumbUrl) : undefined;
  return <Avatar name={member.name} uri={member.avatarUrl} source={fallback} size={size} ring={ring ?? member.isAdmin} />;
}
