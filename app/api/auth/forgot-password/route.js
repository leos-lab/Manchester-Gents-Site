import prisma from '@/lib/prisma';
import { passwordResetRequestSchema } from '@/lib/validators';
import { createPasswordResetToken } from '@/lib/passwordReset';
import { sendPasswordResetEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/appUrl';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normaliseIdentifier(identifier) {
  const trimmed = (identifier || '').trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.replace(/^@/, '');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { identifier } = passwordResetRequestSchema.parse(body);
    const normalised = normaliseIdentifier(identifier);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalised },
          { instagramHandle: normalised }
        ]
      }
    });

    if (user && !user.isPlaceholder) {
      const { token, expiresAt } = await createPasswordResetToken(user.id);
      const baseUrl = getBaseUrl();
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const name = user.preferredName || user.firstName || user.instagramHandle || user.email;

      const result = await sendPasswordResetEmail({
        to: user.email,
        name,
        resetUrl,
        expiresAt
      });

      if (result?.previewUrl && !result.sent) {
        console.info(`Password reset link for ${user.email}: ${resetUrl}`);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return Response.json(
        { error: 'Please enter a valid email or Instagram username.' },
        { status: 400 }
      );
    }
    console.error('Forgot password error:', error);
    return Response.json(
      { error: 'Unable to process reset request right now.' },
      { status: 500 }
    );
  }
}
