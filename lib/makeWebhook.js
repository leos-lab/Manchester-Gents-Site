import { getBaseUrl } from './appUrl';

function buildInstagramLink(handle) {
  if (!handle) {
    return null;
  }
  const normalised = handle.replace(/^@/, '');
  return `https://instagram.com/${normalised}`;
}

export async function sendMakeWebhook(payload) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    return null;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('Make.com webhook failed', response.status, text);
      return null;
    }
    return true;
  } catch (error) {
    console.error('Make.com webhook error', error);
    return null;
  }
}

export function buildEventSignupPayload({
  action = 'event-sign-up',
  memberId,
  memberSlug,
  memberName,
  instagramHandle,
  eventSignupId,
  eventSlug,
  eventName,
  groupChatLink,
  specialRequests,
  actionRequiredMessageId
}) {
  const baseUrl = getBaseUrl();
  const instagramLink = buildInstagramLink(instagramHandle);
  const profileLink = `${baseUrl}/admin/members/${memberSlug}`;
  const adminSignupUrl = `${baseUrl}/admin/events/${eventSlug}/signups/${eventSignupId}`;
  const completeLink = `${baseUrl}/api/groupchatconfirmation/${eventSignupId}`;

  const payload = {
    action,
    timestamp: new Date().toISOString(),
    memberId,
    memberSlug,
    memberName,
    instagramUsername: instagramHandle || null,
    instagramLink,
    eventSignupId,
    eventSlug,
    eventName,
    profileLink,
    adminMemberUrl: profileLink,
    adminSignupUrl,
    groupChatLink: groupChatLink || null,
    completeLink,
    specialRequests: specialRequests || null
  };

  if (actionRequiredMessageId) {
    payload.actionRequiredMessageId = actionRequiredMessageId;
  }

  return payload;
}

export function buildMemberSignupPayload({ memberId, memberSlug, memberName, instagramHandle }) {
  const baseUrl = getBaseUrl();
  const instagramLink = buildInstagramLink(instagramHandle);
  const profileLink = `${baseUrl}/admin/members/${memberSlug}`;

  return {
    action: 'signup',
    timestamp: new Date().toISOString(),
    memberId,
    memberSlug,
    memberName,
    instagramUsername: instagramHandle || null,
    instagramLink,
    profileLink,
    adminMemberUrl: profileLink
  };
}
