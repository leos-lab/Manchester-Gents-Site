import { getRequestUser } from '@/lib/requestUser';
import { uploadMemberPhoto, memberPhotoFileUrl } from '@/lib/pinstripeMedia';
import { toPinstripeRef } from '@/lib/memberPhotoRef';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Private reference photo upload (registration and profile editing). Stored in
// Pinstripe as a "private" member photo: on the home server's disk only.
// Returns a "pinstripe:<id>" reference to save on the User, plus a short-lived
// preview URL for the form.
export async function POST(request) {
  try {
    const user = await getRequestUser(request); // website session or app token
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return Response.json({ error: 'No image provided.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return Response.json({ error: 'Image must be 5MB or smaller.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json({ error: 'Only JPEG, PNG, or WebP images are accepted.' }, { status: 400 });
    }

    // Signed-in members upload under their own id; sign-up uploads are parked
    // under "registration" and moved to the new member when the account is created.
    const memberRef = user?.id || 'registration';
    const photo = await uploadMemberPhoto(memberRef, 'private', {
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name || 'photo.png',
      mimeType: file.type
    });

    return Response.json(
      {
        url: toPinstripeRef(photo.id),
        previewUrl: memberPhotoFileUrl(photo.id, 'display', 30 * 60),
        variant: formData.get('variant') || 'original'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Profile photo upload error:', error);
    return Response.json({ error: error.status === 503 ? error.message : 'Unable to upload image.' }, { status: 500 });
  }
}
