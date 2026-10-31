import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { uploadMemberPhoto, deleteMemberPhoto } from '@/lib/pinstripeMedia';
import { notifyChat } from '@/lib/chatNotify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_SIZE = 10 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

// Who can change a chat's picture: a group's admins, or for the community
// and event chats, the site's admins.
async function assertCanManage(user, roomId) {
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { kind: true, photoUrl: true } });
  if (!room || room.kind === 'DIRECT') throw new ApiError('Chat not found.', 404);
  if (room.kind === 'GROUP') {
    const member = await prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
      select: { isAdmin: true }
    });
    if (!member?.isAdmin) throw new ApiError('Only group admins can change the picture.', 403);
  } else if (user.role !== 'ADMIN') {
    throw new ApiError('Only admins can change this chat’s picture.', 403);
  }
  return room;
}

// The Pinstripe photo id in a picture URL (…/api/member-photos/<id>/avatar).
const photoIdOf = (url) => url?.match(/\/member-photos\/([^/]+)\/avatar/)?.[1] || null;

// POST multipart "file": set the chat's picture (public to its members, so
// stored as a Pinstripe avatar under "room-<id>").
export const POST = v1(async ({ request, params, user }) => {
  const room = await assertCanManage(user, params.roomId);
  const file = (await request.formData()).get('file');
  if (!file || typeof file.arrayBuffer !== 'function') throw new ApiError('No photo attached.');
  if (file.size > MAX_SIZE) throw new ApiError('Photos must be 10MB or smaller.');
  if (!TYPES.includes(file.type)) throw new ApiError('Use a JPEG, PNG, WebP or HEIC photo.');
  const photo = await uploadMemberPhoto(`room-${params.roomId}`, 'avatar', {
    buffer: Buffer.from(await file.arrayBuffer()),
    filename: file.name || 'group.jpg',
    mimeType: file.type
  });
  await prisma.chatRoom.update({ where: { id: params.roomId }, data: { photoUrl: photo.url } });
  const previous = photoIdOf(room.photoUrl);
  if (previous) await deleteMemberPhoto(previous).catch(() => null);
  await notifyChat({ type: 'room_changed', roomId: params.roomId, photoUrl: photo.url }).catch(() => {});
  return { photoUrl: photo.url };
});

export const DELETE = v1(async ({ params, user }) => {
  const room = await assertCanManage(user, params.roomId);
  await prisma.chatRoom.update({ where: { id: params.roomId }, data: { photoUrl: null } });
  const previous = photoIdOf(room.photoUrl);
  if (previous) await deleteMemberPhoto(previous).catch(() => null);
  await notifyChat({ type: 'room_changed', roomId: params.roomId, photoUrl: null }).catch(() => {});
  return { photoUrl: null };
});
