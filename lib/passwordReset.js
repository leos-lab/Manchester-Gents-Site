import { createHash, randomBytes } from 'crypto';
import prisma from './prisma';

const DEFAULT_EXPIRY_MINUTES = 60;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function resolveExpiryMinutes() {
  const raw = Number.parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 10);
  if (Number.isFinite(raw) && raw >= 10 && raw <= 1440) {
    return raw;
  }
  return DEFAULT_EXPIRY_MINUTES;
}

export function getPasswordResetExpiryMinutes() {
  return resolveExpiryMinutes();
}

export async function createPasswordResetToken(userId) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + resolveExpiryMinutes() * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  const record = await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return { token, expiresAt, record };
}

export async function findValidPasswordResetToken(token) {
  if (!token) {
    return null;
  }
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          preferredName: true,
          instagramHandle: true,
          isPlaceholder: true
        }
      }
    }
  });

  if (!record) {
    return null;
  }
  if (record.usedAt) {
    return null;
  }
  if (record.expiresAt < new Date()) {
    try {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
    } catch (error) {
      console.warn('Failed to clean up expired reset token', error);
    }
    return null;
  }

  return record;
}
