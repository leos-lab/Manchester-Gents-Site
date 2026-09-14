import { randomUUID } from 'crypto';
import { placeholderBatchSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normaliseHandle(handle) {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

function buildPlaceholderEmail(handle) {
  const suffix = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  return `placeholder+${handle}-${suffix}@placeholder.manchestergents.com`;
}

export async function POST(request) {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }

  try {
    const body = await request.json();
    const { users } = placeholderBatchSchema.parse(body);

    const created = [];
    const skipped = [];

    for (const entry of users) {
      const handle = normaliseHandle(entry.instagramHandle);
      if (!handle) {
        continue;
      }
      const existing = await prisma.user.findUnique({
        where: { instagramHandle: handle }
      });
      if (existing && !existing.isPlaceholder) {
        skipped.push({ instagramHandle: handle, reason: 'Already a full member' });
        continue;
      }
      if (existing && existing.isPlaceholder) {
        skipped.push({ instagramHandle: handle, reason: 'Placeholder already exists' });
        continue;
      }

      const email = buildPlaceholderEmail(handle);
      const passwordHash = await hashPassword(randomUUID());
      const firstName = entry.firstName.trim();
      const preferredName = entry.preferredName?.trim() || null;
      const displayName = preferredName || firstName;

      const placeholder = await prisma.user.create({
        data: {
          email,
          passwordHash,
          instagramHandle: handle,
          firstName,
          preferredName,
          name: displayName,
          fullName: displayName,
          shareFirstName: true,
          isPlaceholder: true
        },
        select: {
          id: true,
          instagramHandle: true,
          firstName: true,
          preferredName: true
        }
      });
      created.push(placeholder);
    }

    return Response.json({ created, skipped }, { status: 201 });
  } catch (error) {
    console.error('Create placeholder members error:', error);
    return Response.json({ error: 'Unable to create placeholder members.' }, { status: 500 });
  }
}
