import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';
import { ADMIN_MEMBER_SELECT, toAdminMember } from '@/lib/adminMembers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Member directory for admins: ?q= searches names, handle and email;
// ?placeholders=1 includes placeholder profiles. Newest members first.
export const GET = v1(
  async ({ request }) => {
    const params = new URL(request.url).searchParams;
    const q = (params.get('q') || '').trim().replace(/^@/, '');
    const where = {
      ...(params.get('placeholders') === '1' ? {} : { isPlaceholder: false }),
      ...(q
        ? {
            OR: ['firstName', 'lastName', 'preferredName', 'name', 'instagramHandle', 'email'].map((field) => ({
              [field]: { contains: q, mode: 'insensitive' }
            }))
          }
        : {})
    };
    const members = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: ADMIN_MEMBER_SELECT
    });
    return { members: members.map((m) => toAdminMember(m)) };
  },
  { auth: 'admin' }
);
