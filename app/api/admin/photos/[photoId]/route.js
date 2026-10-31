import { requireAuth } from '@/lib/auth';
import { pinstripeApiBase } from '@/lib/pinstripeMedia';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// DELETE: hide a gallery photo (Pinstripe soft delete: it leaves every
// gallery, and the original stays on the server).
export async function DELETE(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (session instanceof Response) return session;
  const res = await fetch(`${pinstripeApiBase()}/api/photos/${encodeURIComponent(params.photoId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.PINSTRIPE_MANAGEMENT_TOKEN}` },
    cache: 'no-store'
  });
  if (!res.ok) return Response.json({ error: 'Couldn’t hide that photo.' }, { status: 502 });
  return Response.json({ ok: true });
}
