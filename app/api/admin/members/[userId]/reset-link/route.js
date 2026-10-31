import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createPasswordResetToken } from '@/lib/passwordReset';
import { getBaseUrl } from '@/lib/appUrl';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LINK_HOURS = 72;

// POST: a password reset link for an admin to send a member by hand (e.g.
// their email is out of date so reset emails don't reach them). Replaces any
// earlier link. After resetting, the member is signed in and asked to check
// their details.
export async function POST(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (session instanceof Response) return session;
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, isPlaceholder: true }
  });
  if (!user) return Response.json({ error: 'Member not found.' }, { status: 404 });
  if (user.isPlaceholder) {
    return Response.json({ error: 'Placeholders don’t have an account yet.' }, { status: 400 });
  }
  const { token, expiresAt } = await createPasswordResetToken(user.id, { expiryMinutes: LINK_HOURS * 60 });
  return Response.json({
    url: `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`,
    expiresAt: expiresAt.toISOString()
  });
}
