import { z } from 'zod';
import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';
import { notifyAdmins } from '@/lib/adminAlerts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(200),
  instagramHandle: z
    .string()
    .trim()
    .transform((h) => h.replace(/^@/, ''))
    .pipe(
      z
        .string()
        .min(2, 'Enter your Instagram username.')
        .max(30)
        .regex(/^[a-z0-9_.]+$/i, 'Instagram usernames only have letters, numbers, periods and underscores.')
    ),
  platform: z.enum(['IOS', 'ANDROID'], { errorMap: () => ({ message: 'Choose iPhone or Android.' }) }),
  message: z.string().trim().max(1000, 'Keep your message under 1,000 characters.').optional().default(''),
  // Honeypot: people never see this field, bots fill it in.
  website: z.string().optional().default('')
});

// Request to join the app beta, from /get-the-app (signed in). Admins approve
// it in the app (Admin → Beta testers), which flags the member and emails the
// install steps. One open request per member and phone.
export const POST = v1(async ({ request, user }) => {
  const data = schema.parse(await request.json().catch(() => ({})));
  if (data.website) return { ok: true };
  const existing = await prisma.betaRequest.findFirst({
    where: { userId: user.id, platform: data.platform, status: { in: ['PENDING', 'APPROVED'] } },
    select: { id: true, status: true }
  });
  if (existing?.status === 'APPROVED') return { ok: true, status: 'APPROVED' };
  if (existing) {
    // Still waiting: keep their latest details.
    await prisma.betaRequest.update({
      where: { id: existing.id },
      data: { email: data.email, instagramHandle: data.instagramHandle.toLowerCase(), message: data.message || null }
    });
    return { ok: true, status: 'PENDING' };
  }
  const created = await prisma.betaRequest.create({
    data: {
      userId: user.id,
      email: data.email,
      instagramHandle: data.instagramHandle.toLowerCase(),
      platform: data.platform,
      message: data.message || null
    }
  });
  await notifyAdmins({
    title: 'Beta request',
    body: `@${created.instagramHandle} wants to test the ${created.platform === 'IOS' ? 'iPhone' : 'Android'} app.`,
    path: '/admin/beta'
  });
  return { ok: true, status: 'PENDING' };
});
