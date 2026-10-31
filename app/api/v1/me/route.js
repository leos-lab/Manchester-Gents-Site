import { z } from 'zod';
import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { verifyPassword } from '@/lib/password';
import { deleteAllMemberPhotos } from '@/lib/pinstripeMedia';
import { PUBLIC_MEMBER_SELECT, toPublicMember, eventsAttendedWhere } from '@/lib/publicProfile';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function loadMe(userId) {
  const [user, eventsAttended] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { ...PUBLIC_MEMBER_SELECT, email: true, termsAgreed: true, photoNoticeAgreedAt: true }
    }),
    prisma.eventSignup.count({ where: eventsAttendedWhere(userId) })
  ]);
  if (!user) throw new ApiError('Account not found.', 404);
  return {
    ...toPublicMember(user, { eventsAttended }),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    preferredName: user.preferredName,
    shareFirstName: user.shareFirstName,
    termsAgreed: user.termsAgreed,
    photoNoticeAgreedAt: user.photoNoticeAgreedAt
  };
}

export const GET = v1(async ({ user }) => ({ me: await loadMe(user.id) }));

const updateSchema = z.object({
  bio: z.string().trim().max(300).nullable().optional(),
  preferredName: z.string().trim().min(1).max(60).nullable().optional(),
  shareFirstName: z.boolean().optional(),
  instagramHandle: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, '').toLowerCase())
    .pipe(z.string().regex(/^[a-z0-9_.]{2,30}$/, 'That doesn’t look like an Instagram username.'))
    .optional()
});

export const PATCH = v1(async ({ request, user }) => {
  const data = updateSchema.parse(await request.json());
  if (data.instagramHandle) {
    const taken = await prisma.user.findFirst({
      where: { instagramHandle: data.instagramHandle, NOT: { id: user.id } },
      select: { id: true }
    });
    if (taken) throw new ApiError('That Instagram handle is already linked to another member.', 409);
  }
  await prisma.user.update({ where: { id: user.id }, data });
  return { me: await loadMe(user.id) };
});

// In-app account deletion (required by the App Store). Signups, chat
// memberships, push tokens and blocks cascade; chat messages stay but show
// no author. Their photos (avatar + private reference photo) are removed
// from Pinstripe first.
export const DELETE = v1(async ({ request, user }) => {
  const { password } = (await request.json().catch(() => ({}))) || {};
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!account || !password || !(await verifyPassword(password, account.passwordHash))) {
    throw new ApiError('Enter your password to delete your account.', 403);
  }
  await deleteAllMemberPhotos(user.id).catch((error) => {
    console.error('Deleting member photos failed', error);
    throw new ApiError('Could not delete your photos just now. Please try again.', 503);
  });
  await prisma.user.delete({ where: { id: user.id } });
  return { deleted: true };
});
