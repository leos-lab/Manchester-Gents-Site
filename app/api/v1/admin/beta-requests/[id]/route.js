import { z } from 'zod';
import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { getHomeContent } from '@/lib/homeContent';
import { sendBetaInviteEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({ action: z.enum(['approve', 'decline']) });

// Approve (flags the member as a beta tester and emails the install steps for
// their phone, using the links under Edit app links on the home page) or
// decline a beta request. Approving one already approved sends the email again.
export const POST = v1(
  async ({ request, params }) => {
    const { action } = schema.parse(await request.json().catch(() => ({})));
    const beta = await prisma.betaRequest.findUnique({ where: { id: params.id } });
    if (!beta) throw new ApiError('That request no longer exists.', 404);

    if (action === 'approve') {
      const { iosAppUrl, androidAppUrl, androidGroupUrl } = await getHomeContent();
      const link = beta.platform === 'IOS' ? iosAppUrl : androidAppUrl;
      if (!link) {
        throw new ApiError(
          `Add the ${beta.platform === 'IOS' ? 'TestFlight invite' : 'Google Play testing'} link first: on the website's home page, Edit app links.`
        );
      }
      const { sent } = await sendBetaInviteEmail({ to: beta.email, platform: beta.platform, iosAppUrl, androidAppUrl, androidGroupUrl });
      if (!sent) throw new ApiError('Couldn’t send the email, so the request is still waiting. Try again.', 503);
    }

    const now = new Date();
    const [updated] = await prisma.$transaction([
      prisma.betaRequest.update({
        where: { id: beta.id },
        data: { status: action === 'approve' ? 'APPROVED' : 'DECLINED', decidedAt: now }
      }),
      ...(action === 'approve'
        ? [prisma.user.updateMany({ where: { id: beta.userId, betaApprovedAt: null }, data: { betaApprovedAt: now } })]
        : [])
    ]);
    return { request: updated };
  },
  { auth: 'admin' }
);
