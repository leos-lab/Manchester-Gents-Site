import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { getHomeContent, saveHomeContent } from '@/lib/homeContent';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const photo = z.object({
  id: z.string().min(1).max(64),
  src: z.string().url(),
  srcSet: z.string().max(2000).optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  // Focus point, percent across and down: pages crop around it.
  focus: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional()
});

const schema = z.object({
  heroCaption: z.string().trim().max(80),
  headline: z.string().trim().min(1, 'Add a headline.').max(60),
  lede: z.string().trim().max(300),
  heroPhoto: photo.nullable(),
  showcase: z.array(photo).max(30),
  iosAppUrl: z.union([z.string().trim().url('Use a full https:// link for the iPhone app.'), z.literal('')]),
  androidAppUrl: z.union([z.string().trim().url('Use a full https:// link for the Android app.'), z.literal('')]),
  eveningPhoto: photo.nullable(),
  eveningTitle: z.string().trim().min(1, 'Add a title for the evening section.').max(60),
  eveningIntro: z.string().trim().max(400),
  eveningPoints: z
    .array(z.object({ title: z.string().trim().max(40), text: z.string().trim().max(200) }))
    .max(4)
});

export async function GET() {
  const session = await requireAuth('ADMIN');
  if (session instanceof Response) return session;
  return Response.json({ content: await getHomeContent() });
}

// Admin → Home page: hero photo and text, and the photos that scroll past on
// the home page for visitors who aren't signed in.
export async function PUT(request) {
  const session = await requireAuth('ADMIN');
  if (session instanceof Response) return session;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || 'Invalid content.' }, { status: 400 });
  return Response.json({ content: await saveHomeContent(parsed.data) });
}
