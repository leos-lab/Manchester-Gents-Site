import Link from 'next/link';
import { format } from 'date-fns';
import prisma from '@/lib/prisma';
import { getDisplayName } from '@/lib/displayName';
import ChatReportActions from './ChatReportActions';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

const PERSON = {
  id: true,
  instagramHandle: true,
  firstName: true,
  lastName: true,
  preferredName: true,
  shareFirstName: true,
  name: true,
  chatBannedAt: true
};

export default async function ChatReportsPage() {
  const [open, banned] = await Promise.all([
    prisma.chatReport.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        reason: true,
        createdAt: true,
        reporter: { select: PERSON },
        message: {
          select: {
            id: true,
            body: true,
            createdAt: true,
            deletedAt: true,
            user: { select: PERSON },
            room: { select: { kind: true, event: { select: { title: true, slug: true } } } }
          }
        }
      }
    }),
    prisma.user.findMany({ where: { chatBannedAt: { not: null } }, select: PERSON, orderBy: { chatBannedAt: 'desc' } })
  ]);

  // Several reports on one message are handled together.
  const byMessage = new Map();
  for (const r of open) {
    const entry = byMessage.get(r.message.id) || { message: r.message, reports: [] };
    entry.reports.push(r);
    byMessage.set(r.message.id, entry);
  }
  const items = [...byMessage.values()];

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.backLink}>← Admin</Link>
        <h1 className="heading-font">Chat reports</h1>
        <p>
          Messages members have reported. Removing a message deletes it for everyone straight away. In DMs you only see the
          reported message, never the rest of the conversation.
        </p>
      </header>

      {items.length === 0 ? (
        <section className={`${styles.card} glass-panel`}>
          <p>No open reports. 🎩</p>
        </section>
      ) : (
        <section className={styles.list}>
          {items.map(({ message, reports }) => {
            const where = message.room.kind === 'EVENT' ? message.room.event?.title || 'Event chat' : 'Direct message';
            return (
              <article key={message.id} className={`${styles.card} glass-panel`}>
                <div className={styles.meta}>
                  <span className={styles.where}>{where}</span>
                  <span>{format(message.createdAt, 'd MMM yyyy, HH:mm')}</span>
                </div>
                <blockquote className={styles.quote}>{message.deletedAt ? <em>Already deleted</em> : message.body}</blockquote>
                <p className={styles.author}>
                  From{' '}
                  {message.user ? (
                    <Link href={`/admin/members/${message.user.instagramHandle}`}>{getDisplayName(message.user)}</Link>
                  ) : (
                    'a deleted account'
                  )}
                  {message.user?.chatBannedAt ? <span className={styles.banned}> · banned from chat</span> : null}
                </p>
                <ul className={styles.reporters}>
                  {reports.map((r) => (
                    <li key={r.id}>
                      Reported by {getDisplayName(r.reporter)} · {format(r.createdAt, 'd MMM, HH:mm')}
                      {r.reason && r.reason !== 'Reported from app' ? ` — “${r.reason}”` : ''}
                    </li>
                  ))}
                </ul>
                <ChatReportActions reportId={reports[0].id} canBan={Boolean(message.user && !message.user.chatBannedAt)} />
              </article>
            );
          })}
        </section>
      )}

      {banned.length ? (
        <section className={`${styles.card} glass-panel`}>
          <h2>Banned from chat</h2>
          <ul className={styles.bannedList}>
            {banned.map((m) => (
              <li key={m.id}>
                <Link href={`/admin/members/${m.instagramHandle}`}>{getDisplayName(m)}</Link> · since{' '}
                {format(m.chatBannedAt, 'd MMM yyyy')}
                <ChatReportActions unbanUserId={m.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
