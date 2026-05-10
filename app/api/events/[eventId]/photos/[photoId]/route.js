import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getPinstripeApiBase() {
  return (process.env.PINSTRIPE_API_URL || process.env.NEXT_PUBLIC_PINSTRIPE_API_URL || '').replace(/\/+$/, '');
}

export async function DELETE(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (session instanceof Response) {
    return session;
  }

  const apiBase = getPinstripeApiBase();
  const managementToken = process.env.PINSTRIPE_MANAGEMENT_TOKEN || process.env.API_TOKEN;

  if (!apiBase || !managementToken) {
    return Response.json(
      { error: 'Pinstripe management API is not configured. Set PINSTRIPE_MANAGEMENT_TOKEN or API_TOKEN.' },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${apiBase}/api/photos/${encodeURIComponent(params.photoId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${managementToken}` },
      cache: 'no-store'
    });
    const json = await res.json().catch(() => null);

    if (!res.ok || json?.success === false) {
      const upstreamError = json?.error || 'Unable to delete photo.';
      const isAuthError = res.status === 401 || res.status === 403;
      console.error('Pinstripe photo delete failed:', {
        status: res.status,
        apiBase,
        error: upstreamError
      });
      return Response.json(
        {
          upstreamStatus: res.status,
          error: isAuthError
            ? 'Pinstripe rejected the management token. Set the same PINSTRIPE_MANAGEMENT_TOKEN or API_TOKEN on the Pinstripe API and restart it.'
            : upstreamError
        },
        { status: isAuthError ? 502 : res.status || 502 }
      );
    }

    return Response.json({ success: true, data: json?.data || null });
  } catch (error) {
    console.error('Delete Pinstripe photo error:', error);
    return Response.json({ error: 'Unable to delete photo.' }, { status: 502 });
  }
}
