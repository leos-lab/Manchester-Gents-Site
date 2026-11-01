import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validators";
import { getDisplayName } from "@/lib/displayName";
import { sendMakeWebhook, buildMemberSignupPayload } from "@/lib/makeWebhook";
import { getBaseUrl } from "@/lib/appUrl";
import { sendWelcomeEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/adminAlerts";
import {
  assertRegistrationPhotos,
  claimRegistrationPhotos,
  PhotoRefError,
} from "@/lib/memberPhotoClaims";
import { pinstripeRefId } from "@/lib/memberPhotoRef";
import { avatarFromPhoto } from "@/lib/memberAvatar";
import { deleteMemberPhoto } from "@/lib/pinstripeMedia";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normaliseHandle(handle) {
  return handle?.trim().replace(/^@/, "").toLowerCase() || "";
}

function buildFallbackHandle(firstName, lastName) {
  const safeName = [firstName, lastName]
    .filter(Boolean)
    .map((part) => part.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .find((part) => part.length > 0);
  const suffix = randomUUID().replace(/-/g, "").slice(0, 6);
  const base = safeName ? safeName.slice(0, 10) : "member";
  return `noinsta_${base}${suffix}`;
}

async function generateFallbackHandle(firstName, lastName) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = buildFallbackHandle(firstName, lastName);
    const existing = await prisma.user.findUnique({
      where: { instagramHandle: candidate },
    });
    if (!existing) {
      return candidate;
    }
  }
  throw new Error("Unable to generate fallback handle");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const email = data.email.toLowerCase();
    const hasInstagram = data.hasInstagram !== false;
    let handle = normaliseHandle(data.instagramHandle || "");
    if (!hasInstagram) {
      handle = await generateFallbackHandle(data.firstName, data.lastName);
    }
    const preferredContactMethod = data.preferredContactMethod?.trim() || null;

    const existingHandleUser = await prisma.user.findUnique({
      where: { instagramHandle: handle },
    });
    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingHandleUser && !existingHandleUser.isPlaceholder) {
      return Response.json(
        { error: "Instagram username already registered." },
        { status: 409 }
      );
    }

    if (existingEmailUser && existingEmailUser.id !== existingHandleUser?.id) {
      return Response.json(
        { error: "Email already registered." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);
    const consentTimestamp = new Date();

    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const preferredName = data.preferredName ?? null;
    const displayName = getDisplayName({
      firstName: data.firstName,
      lastName: data.lastName,
      preferredName,
      shareFirstName: data.shareFirstName,
      instagramHandle: handle,
      name: data.preferredName,
    });

    const avatarUpload = data.avatarChoice === "upload" ? data.avatarPhotoUrl : null;
    const photoRefs = [data.profilePhotoUrl, data.profilePhotoOriginalUrl, avatarUpload];
    await assertRegistrationPhotos(photoRefs);

    const baseUserData = {
      email,
      instagramHandle: handle,
      firstName: data.firstName,
      lastName: data.lastName,
      preferredName,
      name: displayName,
      fullName,
      shareFirstName: data.shareFirstName,
      phoneNumber: data.phoneNumber ?? null,
      preferredContactMethod,
      profilePhotoUrl: data.profilePhotoUrl ?? null,
      profilePhotoOriginalUrl: data.profilePhotoOriginalUrl ?? null,
      termsConsentCulture: data.termsConsentCulture,
      termsSafeSpace: data.termsSafeSpace,
      termsNoHate: data.termsNoHate,
      termsPrivacy: data.termsPrivacy,
      termsGuidelines: data.termsGuidelines,
      termsAgreed: true,
      termsSignedAt: consentTimestamp,
      consentUpdatedAt: consentTimestamp,
      photoNoticeAgreedAt: consentTimestamp,
      // They chose a profile photo (or none) while signing up: the app
      // doesn't ask again.
      avatarPromptDoneAt: data.avatarChoice ? consentTimestamp : null,
      passwordHash,
      isPlaceholder: false,
    };

    let user;
    if (existingHandleUser?.isPlaceholder) {
      user = await prisma.user.update({
        where: { id: existingHandleUser.id },
        data: {
          ...baseUserData,
          createdAt: consentTimestamp,
        },
        select: {
          id: true,
          email: true,
          instagramHandle: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: baseUserData,
        select: {
          id: true,
          email: true,
          instagramHandle: true,
        },
      });
    }

    // Move the sign-up photos from the "registration" holding area to this member.
    await claimRegistrationPhotos(photoRefs, user.id).catch((error) =>
      console.error("Claiming registration photos failed", error)
    );

    // Public profile photo, best effort: they can set it later from their profile.
    const avatarSource = data.avatarChoice === "reference" ? data.profilePhotoUrl : avatarUpload;
    if (avatarSource) {
      await avatarFromPhoto(user.id, pinstripeRefId(avatarSource))
        .then(() => avatarUpload && deleteMemberPhoto(pinstripeRefId(avatarUpload)))
        .catch((error) => console.error("Setting the sign-up avatar failed", error));
    }

    await sendMakeWebhook(
      buildMemberSignupPayload({
        memberId: user.id,
        memberSlug: user.instagramHandle || user.id,
        memberName: displayName,
        instagramHandle: user.instagramHandle || null,
      })
    );

    await notifyAdmins({
      title: "New member",
      body: `${displayName}${user.instagramHandle ? ` (@${user.instagramHandle})` : ""} just joined. Check their photo.`,
      path: `/admin/member/${user.id}`,
    });

    // Welcome email (replaces the old Instagram welcome DM).
    await sendWelcomeEmail({
      to: user.email,
      name: displayName,
      eventsUrl: `${getBaseUrl()}/events`,
    }).catch((error) => console.error("Welcome email failed:", error?.message || error));

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof PhotoRefError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Register error", error);
    return Response.json(
      { error: "Unable to create account." },
      { status: 500 }
    );
  }
}
