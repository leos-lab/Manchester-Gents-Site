import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FIELDS = {
  id: true,
  email: true,
  instagramHandle: true,
  platform: true,
  message: true,
  status: true,
  createdAt: true,
  decidedAt: true,
  user: { select: { id: true, instagramHandle: true } }
};

// Beta requests waiting for an admin, then the latest decided ones. Approve
// or decline with POST /api/v1/admin/beta-requests/:id.
export const GET = v1(
  async () => {
    const [pending, decided] = await Promise.all([
      prisma.betaRequest.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, select: FIELDS }),
      prisma.betaRequest.findMany({ where: { status: { not: 'PENDING' } }, orderBy: { decidedAt: 'desc' }, take: 50, select: FIELDS })
    ]);
    return { pending, decided };
  },
  { auth: 'admin' }
);
