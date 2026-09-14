import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getDisplayName } from '@/lib/displayName';
import AdminMemberEditor from '@/components/AdminMemberEditor';
import AdminMemberEventManager from '@/components/AdminMemberEventManager';
import styles from './member.module.css';

async function getMember(identifier) {
  const lower = identifier.toLowerCase();
  const select = {
    id: true,
    instagramHandle: true,
    firstName: true,
    lastName: true,
    preferredName: true,
    shareFirstName: true,
    email: true,
    phoneNumber: true,
    profilePhotoUrl: true,
    profilePhotoOriginalUrl: true,
    generalPhotoConsent: true,
    groupFaceConsent: true,
    otherFaceConsent: true,
    taggingConsent: true,
    createdAt: true,
    updatedAt: true,
    isPlaceholder: true,
    eventsSignedUp: {
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startTime: true
          }
        }
      }
    }
  };

  const byHandle = await prisma.user.findUnique({
    where: { instagramHandle: lower },
    select
  });
  if (byHandle) {
    return byHandle;
  }

  return prisma.user.findUnique({
    where: { id: identifier },
    select
  });
}

async function getEventOptions() {
  return prisma.event.findMany({
    orderBy: [{ startTime: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      slug: true,
      startTime: true
    }
  });
}

export const metadata = {
  title: 'Member detail | Manchester Gents Admin'
};

export default async function MemberDetailPage({ params }) {
  const member = await getMember(params.handle);
  if (!member) {
    notFound();
  }

  const events = await getEventOptions();

  const displayName = getDisplayName({
    firstName: member.firstName,
    lastName: member.lastName,
    preferredName: member.preferredName,
    shareFirstName: member.shareFirstName,
    instagramHandle: member.instagramHandle
  });

  const consentPairs = [
    ['General photos', member.generalPhotoConsent],
    ['Group photos', member.groupFaceConsent],
    ['Other faces', member.otherFaceConsent],
    ['Tagging', member.taggingConsent]
  ];

  const eventHistory = (member.eventsSignedUp || []).filter((entry) => entry.event);
  const attendedEventIds = eventHistory.map((entry) => entry.event.id);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/admin/members" className={styles.backLink}>
          ← Back to members
        </Link>
        <h1>{displayName}</h1>
        <p>@{member.instagramHandle || 'no-instagram'}</p>
      </header>
      <section className={styles.content}>
        <div className={styles.profileColumn}>
          <div className={styles.profileCard}>
            {member.profilePhotoUrl ? (
              <Image
                src={member.profilePhotoUrl}
                alt={`Reference for ${displayName}`}
                width={160}
                height={160}
                className={styles.profileImage}
              />
            ) : (
              <div className={styles.profilePlaceholder}>{displayName.charAt(0)}</div>
            )}
            <dl className={styles.infoList}>
              <div>
                <dt>First name</dt>
                <dd>{member.firstName || '—'}</dd>
              </div>
              <div>
                <dt>Last name</dt>
                <dd>{member.lastName || '—'}</dd>
              </div>
              <div>
                <dt>Preferred name</dt>
                <dd>{member.preferredName || '—'}</dd>
              </div>
              <div>
                <dt>Name sharing</dt>
                <dd>{member.shareFirstName ? 'Shares first name' : 'Prefers alias'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{member.isPlaceholder ? 'Placeholder' : 'Full member'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{member.email}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{member.phoneNumber || '—'}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{new Date(member.createdAt).toLocaleDateString('en-GB')}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className={styles.detailsColumn}>
          <div className={styles.consentCard}>
            <h2>Photo consents</h2>
            <ul>
              {consentPairs.map(([label, value]) => (
                <li key={label} className={value ? styles.consentYes : styles.consentNo}>
                  <span>{label}</span>
                  <strong>{value ? 'Yes' : 'No'}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.eventsCard}>
            <div className={styles.eventsHeader}>
              <h2>Event history</h2>
              <span className={styles.eventsMeta}>
                {eventHistory.length} {eventHistory.length === 1 ? 'attendance' : 'attendances'}
              </span>
            </div>
            {eventHistory.length > 0 ? (
              <ul className={styles.eventList}>
                {eventHistory.map((signup) => (
                  <li key={signup.id} className={styles.eventRow}>
                    <div className={styles.eventInfo}>
                      <Link href={`/events/${signup.event.slug}/admin`} className={styles.eventTitle}>
                        {signup.event.title}
                      </Link>
                      <span className={styles.eventStart}>
                        {signup.event.startTime
                          ? new Date(signup.event.startTime).toLocaleString('en-GB', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : 'Schedule TBA'}
                      </span>
                    </div>
                    <span className={styles.eventJoined}>
                      Joined {new Date(signup.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyEvents}>No events attended yet.</p>
            )}
            <div className={styles.eventActions}>
              <h3>Add to event</h3>
              <AdminMemberEventManager
                memberId={member.id}
                memberName={displayName}
                events={events}
                existingEventIds={attendedEventIds}
              />
            </div>
          </div>
        </div>
      </section>
      <section className={styles.editorSection}>
        <h2>Edit member</h2>
        <AdminMemberEditor member={member} />
      </section>
    </main>
  );
}
