import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDisplayName } from '@/lib/displayName';
import { sendMakeWebhook, buildEventSignupPayload } from '@/lib/makeWebhook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const signupId = params.id;
  if (!signupId) {
    return NextResponse.json({ error: 'Signup id is required.' }, { status: 400 });
  }

  try {
    const updated = await prisma.eventSignup.update({
      where: { id: signupId },
      data: { groupChatAdded: true },
      select: {
        id: true,
        actionRequiredMessageId: true,
        specialRequests: true,
        event: {
          select: {
            slug: true,
            title: true,
            groupChatLink: true
          }
        },
        user: {
          select: {
            id: true,
            instagramHandle: true,
            firstName: true,
            lastName: true,
            preferredName: true,
            shareFirstName: true,
            name: true
          }
        }
      }
    });

    const memberName = getDisplayName(updated.user);

    const makePayload = buildEventSignupPayload({
      action: 'groupChatAdded',
      memberId: updated.user?.id,
      memberSlug: updated.user?.instagramHandle || updated.user?.id,
      memberName,
      instagramHandle: updated.user?.instagramHandle || null,
      eventSignupId: updated.id,
      eventSlug: updated.event?.slug,
      eventName: updated.event?.title,
      groupChatLink: updated.event?.groupChatLink || null,
      specialRequests: updated.specialRequests || null,
      actionRequiredMessageId: updated.actionRequiredMessageId || null
    });
    await sendMakeWebhook(makePayload);

    const redirectUrl = new URL(`/admin/events/signups/${signupId}?done=1`, request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Group chat confirmation error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Signup not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to update signup.' }, { status: 500 });
  }
}
