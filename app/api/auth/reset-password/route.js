import prisma from '@/lib/prisma';
import { passwordResetSchema } from '@/lib/validators';
import { findValidPasswordResetToken } from '@/lib/passwordReset';
import { hashPassword } from '@/lib/password';
import { bumpSessionVersion } from '@/lib/sessionVersion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return Response.json({ valid: false }, { status: 400 });
  }
  try {
    const record = await findValidPasswordResetToken(token);
    return Response.json({ valid: Boolean(record) });
  } catch (error) {
    console.error('Check reset token error:', error);
    return Response.json({ valid: false }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = passwordResetSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors?.[0]?.message || 'Invalid reset request.' },
        { status: 400 }
      );
    }

    const record = await findValidPasswordResetToken(parsed.data.token);
    if (!record?.userId || record.user?.isPlaceholder) {
      return Response.json(
        { error: 'This reset link is invalid or has expired.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, isPlaceholder: false }
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() }
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: record.userId,
          NOT: { id: record.id }
        }
      })
    ]);
    await bumpSessionVersion();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return Response.json(
      { error: 'Unable to reset password right now.' },
      { status: 500 }
    );
  }
}
