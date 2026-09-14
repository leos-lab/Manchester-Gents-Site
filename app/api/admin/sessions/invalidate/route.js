import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { bumpSessionVersion } from '@/lib/sessionVersion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }

  try {
    const version = await bumpSessionVersion();
    return NextResponse.json({ success: true, version });
  } catch (error) {
    console.error('Admin invalidate sessions error:', error);
    return NextResponse.json(
      { error: 'Unable to sign everyone out right now. Please try again.' },
      { status: 500 }
    );
  }
}
