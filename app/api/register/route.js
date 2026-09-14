import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validators";
import { getDisplayName } from "@/lib/displayName";
import { sendMakeWebhook, buildMemberSignupPayload } from "@/lib/makeWebhook";
import { getBaseUrl } from "@/lib/appUrl";
import { sendInstagramDm } from "@/lib/instagramAutomation";

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
      generalPhotoConsent: data.generalPhotoConsent,
      groupFaceConsent: data.groupFaceConsent,
      otherFaceConsent: data.otherFaceConsent,
      taggingConsent: data.taggingConsent,
      termsConsentCulture: data.termsConsentCulture,
      termsSafeSpace: data.termsSafeSpace,
      termsNoHate: data.termsNoHate,
      termsPrivacy: data.termsPrivacy,
      termsGuidelines: data.termsGuidelines,
      termsAgreed: true,
      termsSignedAt: consentTimestamp,
      consentUpdatedAt: consentTimestamp,
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

    await sendMakeWebhook(
      buildMemberSignupPayload({
        memberId: user.id,
        memberSlug: user.instagramHandle || user.id,
        memberName: displayName,
        instagramHandle: user.instagramHandle || null,
      })
    );

    if (user.instagramHandle) {
      const eventsLink = `${getBaseUrl()}/events/latest`;
      const welcomeMessage = [
        `Hi ${displayName}!`,
        "",
        "Thank you for creating an account on the Manchester Gents website!",
        "",
        "Please continue RSVPing on the website",
        eventsLink,
        "",
        "If you have any quesionts, please feel free to message @manchestergents",
      ].join("\n");
      try {
        const dmResult = await sendInstagramDm({
          username: user.instagramHandle,
          message: welcomeMessage,
        });
        if (dmResult?.response) {
          console.log("Welcome DM response:", dmResult.response);
        }
      } catch (dmError) {
        console.error("Welcome DM failed:", dmError?.message || dmError);
      }
    }

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Register error", error);
    return Response.json(
      { error: "Unable to create account." },
      { status: 500 }
    );
  }
}
