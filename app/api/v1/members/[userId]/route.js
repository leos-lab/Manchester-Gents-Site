import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { PUBLIC_MEMBER_SELECT, toPublicMember, eventsAttendedWhere } from '@/lib/publicProfile';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Member profile: name, avatar, bio, member since, events attended, and an
// Instagram chip. No posts.
export const GET = v1(async ({ params, user }) => {
  const member = await prisma.user.findFirst({
    where: { id: params.userId, isPlaceholder: false },
    select: PUBLIC_MEMBER_SELECT
  });
  if (!member) throw new ApiError('Member not found.', 404);
  const [eventsAttended, block] = await Promise.all([
    prisma.eventSignup.count({ where: eventsAttendedWhere(member.id) }),
    prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: user.id, blockedId: member.id },
          { blockerId: member.id, blockedId: user.id }
        ]
      },
      select: { blockerId: true }
    })
  ]);
  return {
    member: toPublicMember(member, {
      eventsAttended,
      isMe: member.id === user.id,
      blockedByMe: block?.blockerId === user.id,
      canMessage: member.id !== user.id && !block
    })
  };
});
