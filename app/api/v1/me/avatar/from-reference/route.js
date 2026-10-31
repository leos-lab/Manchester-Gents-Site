import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { pinstripeRefId } from '@/lib/memberPhotoRef';
import { deleteMemberPhoto, memberPhotoFileUrl, uploadMemberPhoto } from '@/lib/pinstripeMedia';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST: use your private reference photo as your public avatar too (a copy:
// the private photo itself stays private). Pinstripe crops it to a square.
export const POST = v1(async ({ user }) => {
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { profilePhotoUrl: true, avatarPhotoId: true }
  });
  const photoId = pinstripeRefId(me?.profilePhotoUrl);
  if (!photoId) throw new ApiError('You don’t have a reference photo to use.', 400);

  const source = await fetch(memberPhotoFileUrl(photoId, 'display', 60), { cache: 'no-store' });
  if (!source.ok) throw new ApiError('Couldn’t read your reference photo. Try again.', 502);
  const avatar = await uploadMemberPhoto(user.id, 'avatar', {
    buffer: Buffer.from(await source.arrayBuffer()),
    filename: 'avatar.jpg',
    mimeType: source.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
  });
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: avatar.url, avatarPhotoId: avatar.id } });
  if (me.avatarPhotoId && me.avatarPhotoId !== avatar.id) await deleteMemberPhoto(me.avatarPhotoId).catch(() => null);
  return { avatarUrl: avatar.url };
});
