import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { PUBLIC_MEMBER_SELECT, toPublicMember } from '@/lib/publicProfile';
import styles from './members.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Members | Manchester Gents' };

// Find a member to message. Without a search it shows people you've been to
// socials with, rather than a directory of everyone.
export default async function MembersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?redirect=/members');
  const q = String(searchParams?.q || '').trim().replace(/^@/, '').slice(0, 60);

  const members = q.length >= 2
    ? await prisma.user.findMany({
        where: {
          isPlaceholder: false,
          NOT: { id: session.user.id },
          OR: [
            { instagramHandle: { contains: q, mode: 'insensitive' } },
            { preferredName: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { AND: [{ shareFirstName: true }, { lastName: { contains: q, mode: 'insensitive' } }] }
          ]
        },
        take: 30,
        orderBy: { firstName: 'asc' },
        select: PUBLIC_MEMBER_SELECT
      })
    : await prisma.user.findMany({
        where: {
          isPlaceholder: false,
          NOT: { id: session.user.id },
          eventsSignedUp: {
            some: {
              status: 'CONFIRMED',
              event: { attendees: { some: { userId: session.user.id, status: 'CONFIRMED' } } }
            }
          }
        },
        take: 30,
        orderBy: { firstName: 'asc' },
        select: PUBLIC_MEMBER_SELECT
      });

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.directory}>
        <h1 className="heading-font">Members</h1>
        <form className={styles.search} role="search">
          <label htmlFor="q" className={styles.srOnly}>Search members</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Search by name or @instagram" autoComplete="off" />
          <button type="submit">Search</button>
        </form>
        <h2 className={styles.listTitle}>{q.length >= 2 ? `Members matching “${q}”` : 'People you’ve been to socials with'}</h2>
        {members.length ? (
          <ul className={styles.people}>
            {members.map((u) => {
              const m = toPublicMember(u);
              return (
                <li key={m.id}>
                  <Link href={`/members/${m.id}`} className={styles.person}>
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatarUrl} alt="" loading="lazy" />
                    ) : (
                      <span className={styles.initial} aria-hidden="true">{(m.name[0] || 'M').toUpperCase()}</span>
                    )}
                    <span className={styles.personName}>{m.name}</span>
                    {m.instagram ? <span className={styles.personHandle}>@{m.instagram.handle}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.note}>
            {q.length >= 2 ? 'No members found. Try a first name or an Instagram handle.' : 'Once you’ve been to a social, the gents you met will show here. Search for anyone above.'}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
