import { v1, ApiError } from '@/lib/apiV1';
import { uploadMemberPhoto } from '@/lib/pinstripeMedia';
import { toPinstripeRef } from '@/lib/memberPhotoRef';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_SIZE = 10 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

// A photo to send in a chat. Stored privately on Pinstripe under the sender;
// send the returned imageUrl ("pinstripe:<id>") with the chat message. Only
// people in that chat can then load it (GET /api/v1/chat/messages/:id/image).
export const POST = v1(async ({ request, user }) => {
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') throw new ApiError('No photo attached.');
  if (file.size > MAX_SIZE) throw new ApiError('Photos must be 10MB or smaller.');
  if (!TYPES.includes(file.type)) throw new ApiError('Send a JPEG, PNG, WebP or HEIC photo.');
  const photo = await uploadMemberPhoto(user.id, 'private', {
    buffer: Buffer.from(await file.arrayBuffer()),
    filename: file.name || 'photo.jpg',
    mimeType: file.type
  });
  return { imageUrl: toPinstripeRef(photo.id) };
});
