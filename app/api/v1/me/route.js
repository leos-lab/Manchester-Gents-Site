import { z } from 'zod';
import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { verifyPassword } from '@/lib/password';
import { deleteAllMemberPhotos } from '@/lib/pinstripeMedia';
import { PUBLIC_MEMBER_SELECT, toPublicMember, eventsAttendedWhere } from '@/lib/publicProfile';
import { getDisplayName } from '@/lib/displayName';
import { photoSrc } from '@/lib/memberPhotoRef';
import { assertProfilePhotos, deleteReplacedPhotos, PhotoRefError } from '@/lib/memberPhotoClaims';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function loadMe(userId) {
  const [user, eventsAttended] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...PUBLIC_MEMBER_SELECT,
        email: true,
        phoneNumber: true,
        preferredContactMethod: true,
        profilePhotoUrl: true,
        termsAgreed: true,
        termsSignedAt: true,
        photoNoticeAgreedAt: true,
        avatarPromptDoneAt: true
      }
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
    phoneNumber: user.phoneNumber,
    preferredContactMethod: user.preferredContactMethod,
    // Private: only this member and admins can load it (send the app token).
    referencePhotoUrl: photoSrc(user.profilePhotoUrl, 'medium'),
    termsAgreed: user.termsAgreed,
    termsSignedAt: user.termsSignedAt,
    photoNoticeAgreedAt: user.photoNoticeAgreedAt,
    avatarPromptDoneAt: user.avatarPromptDoneAt
  };
}

export const GET = v1(async ({ user }) => ({ me: await loadMe(user.id) }));

const optional = (schema) =>
  z.union([schema, z.literal(''), z.null()]).transform((v) => v || null).optional();

// Everything the website's profile page can change, plus the bio and handle.
const updateSchema = z.object({
  bio: z.string().trim().max(300).nullable().optional(),
  firstName: z.string().trim().min(1, 'Please provide your first name.').max(60).optional(),
  lastName: z.string().trim().min(1, 'Please provide your last name.').max(60).optional(),
  preferredName: optional(z.string().trim().min(1).max(60)),
  shareFirstName: z.boolean().optional(),
  phoneNumber: optional(z.string().trim().min(7, 'Please provide at least 7 digits.').max(30)),
  preferredContactMethod: optional(z.string().trim().min(3, 'Please let us know how to reach you.').max(120)),
  instagramHandle: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, '').toLowerCase())
    .pipe(z.string().regex(/^[a-z0-9_.]{2,30}$/, 'That doesn’t look like an Instagram username.'))
    .optional(),
  // A "pinstripe:<id>" ref from POST /api/profile/photo.
  referencePhoto: z.string().min(1).optional(),
  acceptTerms: z.literal(true).optional(),
  photoNoticeAgreed: z.literal(true).optional(),
  // The app's one-off "what's new / choose an avatar" prompt is done.
  avatarPromptDone: z.literal(true).optional()
});

export const PATCH = v1(async ({ request, user }) => {
  const { acceptTerms, photoNoticeAgreed, avatarPromptDone, referencePhoto, ...data } = updateSchema.parse(
    await request.json()
  );
  const current = await prisma.user.findUnique({ where: { id: user.id } });
  if (data.instagramHandle) {
    const taken = await prisma.user.findFirst({
      where: { instagramHandle: data.instagramHandle, NOT: { id: user.id } },
      select: { id: true }
    });
    if (taken) throw new ApiError('That Instagram handle is already linked to another member.', 409);
  }
  const next = { ...current, ...data };
  if (next.shareFirstName === false && !next.preferredName) {
    throw new ApiError('Please provide a preferred name if you do not want your first name displayed.');
  }
  const now = new Date();
  const update = {
    ...data,
    name: getDisplayName(next),
    fullName: [next.firstName, next.lastName].filter(Boolean).join(' ') || null
  };
  if (acceptTerms) {
    Object.assign(update, {
      termsConsentCulture: true,
      termsSafeSpace: true,
      termsNoHate: true,
      termsPrivacy: true,
      termsGuidelines: true,
      termsAgreed: true,
      termsSignedAt: now,
      consentUpdatedAt: now
    });
  }
  if (photoNoticeAgreed) update.photoNoticeAgreedAt = now;
  if (avatarPromptDone) update.avatarPromptDoneAt = now;

  const previousPhotos = [current.profilePhotoUrl, current.profilePhotoOriginalUrl];
  const nextPhotos = referencePhoto ? [referencePhoto, referencePhoto] : previousPhotos;
  if (referencePhoto) {
    await assertProfilePhotos(nextPhotos, previousPhotos, user.id).catch((error) => {
      if (error instanceof PhotoRefError) throw new ApiError(error.message);
      throw error;
    });
    update.profilePhotoUrl = referencePhoto;
    update.profilePhotoOriginalUrl = referencePhoto;
  }

  await prisma.user.update({ where: { id: user.id }, data: update });
  if (referencePhoto) await deleteReplacedPhotos(previousPhotos, nextPhotos);
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
