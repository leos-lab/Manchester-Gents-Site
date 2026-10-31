import { NextResponse } from "next/server";
import { format } from "date-fns";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getBaseUrl } from "@/lib/appUrl";
import { sendRsvpReminderEmail } from "@/lib/email";
import { pushToUsers, hasPushToken } from "@/lib/expoPush";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeHandle(handle) {
  return (handle || "").replace(/^@/, "").trim().toLowerCase();
}

function getFriendlyFirstName(member) {
  const preferred = member.preferredName?.trim();
  if (preferred) return preferred;
  const first = member.firstName?.trim();
  if (first) return first;
  return normalizeHandle(member.instagramHandle) || "there";
}

export async function POST(request) {
  const session = await requireAuth("ADMIN");
  if (!session.user) {
    return session;
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const userId = typeof payload?.userId === "string" ? payload.userId : "";
  const eventId = typeof payload?.eventId === "string" ? payload.eventId : "";

  if (!userId || !eventId) {
    return NextResponse.json(
      { error: "Missing userId or eventId." },
      { status: 400 }
    );
  }

  try {
    const [member, event] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          instagramHandle: true,
          email: true,
          firstName: true,
          lastName: true,
          preferredName: true,
          shareFirstName: true,
          role: true,
          isPlaceholder: true,
        },
      }),
      prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          slug: true,
          title: true,
          startTime: true,
          published: true,
        },
      }),
    ]);

    if (!member || member.isPlaceholder || member.role !== "MEMBER") {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (!event || !event.published) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const memberName = getFriendlyFirstName(member);

    // Members with the app get a push notification that opens the event;
    // everyone else still gets the Instagram DM.
    // (The admin table always sends its message template; that text is for the
    // Instagram DM, so app users get the short push version instead.)
    if (await hasPushToken(member.id)) {
      const dateLabel = format(new Date(event.startTime), "EEE d MMM");
      const delivered = await pushToUsers([member.id], {
        title: `RSVP for ${event.title}`,
        body: `Hi ${memberName}, are you joining us on ${dateLabel}? Tap to reserve your spot.`,
        data: { eventId: event.id, url: `mcrgents://event/${event.id}` },
      });
      if (delivered > 0) {
        return NextResponse.json({ ok: true, via: "push" });
      }
    }

    // Everyone else gets an email (replaces the old Instagram DM).
    if (!member.email) {
      return NextResponse.json(
        { error: "Member has no email address and isn't on the app." },
        { status: 400 }
      );
    }
    const emailResult = await sendRsvpReminderEmail({
      to: member.email,
      name: memberName,
      eventTitle: event.title,
      dateLabel: format(new Date(event.startTime), "EEEE d MMMM"),
      eventUrl: `${getBaseUrl()}/events/${event.slug}`,
    });
    if (!emailResult.sent) {
      return NextResponse.json(
        { error: "Email isn't set up on the website (SMTP settings missing)." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, via: "email" });
  } catch (error) {
    console.error("Admin RSVP reminder send error:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to send reminder right now." },
      { status: 500 }
    );
  }
}
