import prisma from './prisma';

// Who can read a chat room (mirrors chat-server/src/store.js getAccess):
// DMs only their two members (admins included), event chats the members going
// and admins, the community chat every member.
export async function canReadRoom(user, roomId) {
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { kind: true, eventId: true } });
  if (!room) return false;
  if (room.kind === 'DIRECT') {
    return Boolean(await prisma.chatRoomMember.findUnique({ where: { roomId_userId: { roomId, userId: user.id } } }));
  }
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { isPlaceholder: true } });
  if (!account || account.isPlaceholder) return false;
  if (room.kind === 'COMMUNITY') return true;
  if (user.role === 'ADMIN') return true;
  const signup = await prisma.eventSignup.findUnique({
    where: { eventId_userId: { eventId: room.eventId, userId: user.id } },
    select: { status: true }
  });
  return signup?.status === 'CONFIRMED';
}
