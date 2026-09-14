import { NextResponse } from 'next/server';
import { getPhotoNoticeConfig } from '@/lib/photoNoticeConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const config = await getPhotoNoticeConfig();
  return NextResponse.json({
    enabled: config.enabled,
    updatedAt: config.updatedAt ? config.updatedAt.toISOString() : null
  });
}
