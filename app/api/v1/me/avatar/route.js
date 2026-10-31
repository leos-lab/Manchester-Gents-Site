import { z } from 'zod';
import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { memberUploadTarget, getMemberPhoto, deleteMemberPhoto } from '@/lib/pinstripeMedia';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Public profile picture, hosted via Pinstripe. Two steps so the image goes
// straight from the phone to Pinstripe (not through this server):
//   1. POST   → { upload: { url, token, kind, field } }
//      then POST the image to upload.url as multipart (field "file", plus
//      "kind"), with "Authorization: Bearer <upload.token>".
//   2. PUT { photoId } → sets it as your avatar.
export const POST = v1(async ({ user }) => ({ upload: memberUploadTarget(user.id, 'avatar') }));

export const PUT = v1(async ({ request, user }) => {
  const { photoId } = z.object({ photoId: z.string().min(1).max(64) }).parse(await request.json());
  const photo = await getMemberPhoto(photoId).catch(() => null);
  if (!photo || photo.memberRef !== user.id || photo.kind !== 'avatar' || !photo.url) {
    throw new ApiError('That photo can’t be used as your avatar.', 400);
  }
  const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarPhotoId: true } });
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: photo.url, avatarPhotoId: photo.id } });
  if (previous?.avatarPhotoId && previous.avatarPhotoId !== photo.id) {
    await deleteMemberPhoto(previous.avatarPhotoId).catch(() => null);
  }
  return { avatarUrl: photo.url };
});

export const DELETE = v1(async ({ user }) => {
  const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarPhotoId: true } });
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null, avatarPhotoId: null } });
  if (previous?.avatarPhotoId) await deleteMemberPhoto(previous.avatarPhotoId).catch(() => null);
  return { avatarUrl: null };
});
