import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { pinstripeRefId } from '@/lib/memberPhotoRef';
import { avatarFromPhoto } from '@/lib/memberAvatar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST: use your private reference photo as your public avatar too (a copy:
// the private photo itself stays private). Pinstripe crops it to a square.
export const POST = v1(async ({ user }) => {
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { profilePhotoUrl: true } });
  const photoId = pinstripeRefId(me?.profilePhotoUrl);
  if (!photoId) throw new ApiError('You don’t have a reference photo to use.', 400);
  try {
    const avatar = await avatarFromPhoto(user.id, photoId);
    return { avatarUrl: avatar.url };
  } catch (error) {
    if (error.status === 502) throw new ApiError(error.message, 502);
    throw error;
  }
});
