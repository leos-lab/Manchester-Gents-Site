import prisma from './prisma';
import { getPinstripeEventSlug } from './pinstripe';

// Past events whose galleries admins pick photos from, newest first.
export async function galleryEvents() {
  const events = await prisma.event.findMany({
    where: { startTime: { lt: new Date() } },
    orderBy: { startTime: 'desc' },
    select: { id: true, slug: true, title: true, galleryUrl: true, featuredPhotoIds: true }
  });
  return events.map((e) => ({ id: e.id, title: e.title, gallerySlug: getPinstripeEventSlug(e), featuredPhotoIds: e.featuredPhotoIds }));
}
