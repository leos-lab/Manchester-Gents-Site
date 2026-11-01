import prisma from './prisma';
import { deleteMemberPhoto, memberPhotoFileUrl, uploadMemberPhoto } from './pinstripeMedia';

// Make a copy of one of a member's private photos (their reference photo, or
// one uploaded at sign-up) their public avatar. The private photo itself stays
// private. Pinstripe crops avatars to a square.
export async function avatarFromPhoto(userId, photoId) {
  const source = await fetch(memberPhotoFileUrl(photoId, 'display', 60), { cache: 'no-store' });
  if (!source.ok) {
    const error = new Error('Couldn’t read that photo. Try again.');
    error.status = 502;
    throw error;
  }
  const avatar = await uploadMemberPhoto(userId, 'avatar', {
    buffer: Buffer.from(await source.arrayBuffer()),
    filename: 'avatar.jpg',
    mimeType: source.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
  });
  const previous = await prisma.user.findUnique({ where: { id: userId }, select: { avatarPhotoId: true } });
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl: avatar.url, avatarPhotoId: avatar.id } });
  if (previous?.avatarPhotoId && previous.avatarPhotoId !== avatar.id) await deleteMemberPhoto(previous.avatarPhotoId).catch(() => null);
  return avatar;
}
