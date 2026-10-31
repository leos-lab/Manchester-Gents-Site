import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { PUBLIC_MEMBER_SELECT, toPublicMember, eventsAttendedWhere } from '@/lib/publicProfile';
import styles from '../members.module.css';

export const dynamic = 'force-dynamic';

// Member profile (members only): photo, name, member since, events attended,
// Instagram. No posts.
export default async function MemberPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?redirect=${encodeURIComponent(`/members/${params.id}`)}`);

  const user = await prisma.user.findFirst({ where: { id: params.id, isPlaceholder: false }, select: PUBLIC_MEMBER_SELECT });
  if (!user) notFound();

  const [eventsAttended, block, shared] = await Promise.all([
    prisma.eventSignup.count({ where: eventsAttendedWhere(user.id) }),
    prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: session.user.id, blockedId: user.id },
          { blockerId: user.id, blockedId: session.user.id }
        ]
      },
      select: { blockerId: true }
    }),
    // Socials you've both been to, newest first.
    prisma.event.findMany({
      where: {
        published: true,
        startTime: { lt: new Date() },
        AND: [
          { attendees: { some: { userId: user.id, status: 'CONFIRMED' } } },
          { attendees: { some: { userId: session.user.id, status: 'CONFIRMED' } } }
        ]
      },
      orderBy: { startTime: 'desc' },
      take: 6,
      select: { id: true, slug: true, title: true, coverImageUrl: true }
    })
  ]);
  const member = toPublicMember(user, { eventsAttended });
  const isMe = user.id === session.user.id;
  const memberSince = new Date(member.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.profile}>
        <div className={styles.portrait}>
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatarUrl} alt={`${member.name}`} />
          ) : (
            <span aria-hidden="true">{(member.name[0] || 'M').toUpperCase()}</span>
          )}
        </div>
        <div className={styles.details}>
          <h1 className="heading-font">{member.name}</h1>
          {member.isAdmin ? <p className={styles.team}>Manchester Gents team</p> : null}
          <dl className={styles.stats}>
            <div>
              <dt>Socials attended</dt>
              <dd>{eventsAttended}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{memberSince}</dd>
            </div>
          </dl>
          {member.bio ? <p className={styles.bio}>{member.bio}</p> : null}
          <div className={styles.actions}>
            {!isMe && !block ? (
              <Link href={`/chat?dm=${encodeURIComponent(member.id)}`} className={styles.primary}>
                Message {member.name}
              </Link>
            ) : null}
            {isMe ? (
              <Link href="/profile" className={styles.primary}>Edit your profile</Link>
            ) : null}
            {member.instagram ? (
              <a href={member.instagram.url} className={styles.instagram} target="_blank" rel="noopener noreferrer">
                @{member.instagram.handle} on Instagram
              </a>
            ) : null}
          </div>
          {block?.blockerId === session.user.id ? (
            <p className={styles.note}>You’ve blocked {member.name}. Unblock them from the app.</p>
          ) : null}
        </div>

        {!isMe && shared.length ? (
          <section className={styles.shared} aria-labelledby="shared-socials">
            <h2 id="shared-socials">Socials you’ve both been to</h2>
            <ul>
              {shared.map((event) => (
                <li key={event.id}>
                  <Link href={`/events/${event.slug}`}>
                    {event.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.coverImageUrl} alt="" loading="lazy" />
                    ) : (
                      <span className={styles.cloth} aria-hidden="true" />
                    )}
                    <span>{event.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
