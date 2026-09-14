import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const token = process.env.MAKE_WEBHOOK_TOKEN;
  if (token) {
    const authHeader = request.headers.get('authorization') || '';
    const expected = `Bearer ${token}`;
    if (authHeader !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = (await request.json().catch(() => ({}))) || {};
  const { signupId, messageId } = body;
  if (!signupId || !messageId) {
    return NextResponse.json({ error: 'signupId and messageId are required.' }, { status: 400 });
  }

  try {
    await prisma.eventSignup.update({
      where: { id: signupId },
      data: { actionRequiredMessageId: String(messageId) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update action-required message id failed:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Signup not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to store message id.' }, { status: 500 });
  }
}
