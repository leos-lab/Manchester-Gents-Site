import { getRequestUser } from '@/lib/requestUser';
import { getMemberPhoto, memberPhotoFileUrl } from '@/lib/pinstripeMedia';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Serves a private member photo to the member themselves or an admin. The
// image is fetched from Pinstripe (signed, server-side) and streamed back
// same-origin, so it also works in the in-browser cropper.
export async function GET(request, { params }) {
  const user = await getRequestUser(request); // website session or app token
  if (!user) return new Response('Not signed in', { status: 401 });

  try {
    const photo = await getMemberPhoto(params.photoId);
    const isOwner = photo.memberRef === user.id;
    if (!isOwner && user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

    const asked = new URL(request.url).searchParams.get('v');
    const variant = ['thumb', 'medium', 'original'].includes(asked) ? asked : 'display';
    if (variant === 'original') {
      // Originals can exceed the hosting response limit, so hand off with a signed link.
      return Response.redirect(memberPhotoFileUrl(photo.id, 'original', 120), 302);
    }
    const upstream = await fetch(memberPhotoFileUrl(photo.id, variant, 60), { cache: 'no-store' });
    if (!upstream.ok) return new Response('Photo unavailable', { status: 502 });
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    return new Response(error.status === 404 ? 'Not found' : 'Photo unavailable', {
      status: error.status === 404 ? 404 : 502
    });
  }
}
