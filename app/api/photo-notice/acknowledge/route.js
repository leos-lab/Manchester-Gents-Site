import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { photoNoticeAgreedAt: new Date() },
    select: { photoNoticeAgreedAt: true }
  });

  return Response.json({
    photoNoticeAgreedAt: user.photoNoticeAgreedAt.toISOString()
  });
}
