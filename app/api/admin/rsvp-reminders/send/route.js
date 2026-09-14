import { NextResponse } from "next/server";
import { format } from "date-fns";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getBaseUrl } from "@/lib/appUrl";
import { sendInstagramDm } from "@/lib/instagramAutomation";

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

function buildDefaultReminderMessage({
  memberName,
  eventTitle,
  eventStartTime,
  rsvpLink,
}) {
  const dateLabel = eventStartTime
    ? format(new Date(eventStartTime), "EEE d MMM yyyy • h:mmaaa")
    : "";

  return [
    `Hi ${memberName}!`,
    "",
    "Thank you for being part of Manchester Gents by registering an account with us!",
    "",
    `Quick reminder to RSVP for ${eventTitle}${
      dateLabel ? ` (${dateLabel})` : ""
    }.`,
    "",
    "RSVP here:",
    rsvpLink,
    "",
    "If you have any questions, please message @manchestergents. 🕴️🐝",
  ].join("\n");
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
  const messageOverride =
    typeof payload?.message === "string" ? payload.message : null;

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

    const username = normalizeHandle(member.instagramHandle);
    if (!username) {
      return NextResponse.json(
        { error: "Member has no Instagram handle." },
        { status: 400 }
      );
    }

    const memberName = getFriendlyFirstName(member);

    const rsvpLink = `${getBaseUrl()}/events/${event.slug}`;
    const message =
      messageOverride?.trim() ||
      buildDefaultReminderMessage({
        memberName,
        eventTitle: event.title,
        eventStartTime: event.startTime,
        rsvpLink,
      });

    await sendInstagramDm({ username, message });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin RSVP reminder send error:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to send reminder right now." },
      { status: 500 }
    );
  }
}
