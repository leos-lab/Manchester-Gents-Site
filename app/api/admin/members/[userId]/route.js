import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  preferredName: z.string().optional(),
  shareFirstName: z.boolean().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  generalPhotoConsent: z.boolean().optional(),
  groupFaceConsent: z.boolean().optional(),
  otherFaceConsent: z.boolean().optional(),
  taggingConsent: z.boolean().optional(),
  isPlaceholder: z.boolean().optional()
});

export async function PATCH(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }

  const { userId } = params;
  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const updatePayload = {};
    if ('firstName' in data) updatePayload.firstName = data.firstName;
    if ('lastName' in data) updatePayload.lastName = data.lastName;
    if ('preferredName' in data) updatePayload.preferredName = data.preferredName || null;
    if ('shareFirstName' in data) updatePayload.shareFirstName = data.shareFirstName;
    if ('email' in data) updatePayload.email = data.email;
    if ('phoneNumber' in data) updatePayload.phoneNumber = data.phoneNumber || null;
    if ('generalPhotoConsent' in data) updatePayload.generalPhotoConsent = data.generalPhotoConsent;
    if ('groupFaceConsent' in data) updatePayload.groupFaceConsent = data.groupFaceConsent;
    if ('otherFaceConsent' in data) updatePayload.otherFaceConsent = data.otherFaceConsent;
    if ('taggingConsent' in data) updatePayload.taggingConsent = data.taggingConsent;
    if ('isPlaceholder' in data) updatePayload.isPlaceholder = data.isPlaceholder;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updatePayload,
      select: {
        id: true,
        instagramHandle: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        shareFirstName: true,
        email: true,
        phoneNumber: true,
        generalPhotoConsent: true,
        groupFaceConsent: true,
        otherFaceConsent: true,
        taggingConsent: true,
        isPlaceholder: true
      }
    });

    return Response.json({ member: updated });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return Response.json({ error: error.issues?.[0]?.message || 'Invalid payload.' }, { status: 400 });
    }
    console.error('Admin update member error:', error);
    return Response.json({ error: 'Unable to update member.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }

  const { userId } = params;
  try {
    await prisma.user.delete({ where: { id: userId } });
    return Response.json({ success: true });
  } catch (error) {
    console.error('Admin delete member error:', error);
    return Response.json({ error: 'Unable to remove member.' }, { status: 500 });
  }
}
