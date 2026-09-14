import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LatestEventRedirectPage() {
  let event = null;

  try {
    const now = new Date();
    const startWindow = new Date(now.getTime() - 1000 * 60 * 60 * 24);

    event = await prisma.event.findFirst({
      where: {
        published: true,
        startTime: {
          gte: startWindow
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    if (!event?.slug) {
      event = await prisma.event.findFirst({
        where: { published: true },
        orderBy: { startTime: 'desc' }
      });
    }
  } catch (error) {
    console.error('Failed to resolve latest event redirect:', error);
    event = null;
  }

  if (!event?.slug) {
    redirect('/events');
  }

  redirect(`/events/${event.slug}`);
}
