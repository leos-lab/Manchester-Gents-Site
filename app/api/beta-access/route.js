import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Asked by middleware on dev and UAT: is the signed-in member in the beta?
// (Their session doesn't change when an admin approves them.)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ approved: false });
  if (session.user.role === 'ADMIN') return Response.json({ approved: true });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { betaApprovedAt: true } });
  return Response.json({ approved: Boolean(user?.betaApprovedAt) });
}
