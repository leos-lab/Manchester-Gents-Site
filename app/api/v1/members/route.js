import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';
import { PUBLIC_MEMBER_SELECT, toPublicMember } from '@/lib/publicProfile';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Member search for starting a DM. GET /api/v1/members?q=alex
export const GET = v1(async ({ request, user }) => {
  const q = (new URL(request.url).searchParams.get('q') || '').trim().replace(/^@/, '');
  if (q.length < 2) return { members: [] };
  const members = await prisma.user.findMany({
    where: {
      isPlaceholder: false,
      NOT: { id: user.id },
      OR: [
        { instagramHandle: { contains: q, mode: 'insensitive' } },
        { preferredName: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        // Surnames are only searchable for members who share them.
        { AND: [{ shareFirstName: true }, { lastName: { contains: q, mode: 'insensitive' } }] }
      ]
    },
    take: 20,
    orderBy: { firstName: 'asc' },
    select: PUBLIC_MEMBER_SELECT
  });
  return { members: members.map((m) => toPublicMember(m)) };
});
