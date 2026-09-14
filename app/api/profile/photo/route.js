import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function uploadToCloudinary(buffer, folder, fileType, options = {}) {
  const base64 = buffer.toString('base64');
  const dataUri = `data:${fileType};base64,${base64}`;
  return cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    overwrite: true,
    quality: 'auto:eco',
    ...options
  });
}

export async function POST(request) {
  const requiredEnv = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  if (missingEnv.length) {
    console.error('Profile photo upload error: missing Cloudinary env vars', missingEnv);
    return NextResponse.json(
      { error: `Cloudinary configuration missing: ${missingEnv.join(', ')}` },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const variant = formData.get('variant') || 'original';

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Image must be 5MB or smaller.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images are accepted.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const folder =
      variant === 'cropped'
        ? 'manchester-gents/profiles/cropped'
        : 'manchester-gents/profiles/original';

    const result = await uploadToCloudinary(
      buffer,
      folder,
      file.type,
      variant === 'cropped' ? { format: 'png' } : {}
    );

    return NextResponse.json(
      {
        url: result.secure_url,
        publicId: result.public_id,
        variant
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Profile photo upload error:', error);
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : 'Unable to upload image.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
