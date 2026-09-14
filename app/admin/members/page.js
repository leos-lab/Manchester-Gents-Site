import Image from 'next/image';
import Link from 'next/link';
import { FaCamera } from 'react-icons/fa';
import { FaPeopleGroup, FaPerson, FaUserTag } from 'react-icons/fa6';
import prisma from '@/lib/prisma';
import AdminPlaceholderForm from '@/components/AdminPlaceholderForm';
import styles from './members.module.css';

async function getMembers() {
  return prisma.user.findMany({
    select: {
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
      isPlaceholder: true,
      _count: {
        select: {
          eventsSignedUp: true
        }
      }
    }
  });
}

export const metadata = {
  title: 'Members | Manchester Gents Admin'
};

const defaultDirections = {
  joined: 'desc',
  events: 'desc'
};

const directionLabels = {
  joined: {
    asc: 'Oldest to newest',
    desc: 'Newest to oldest'
  },
  events: {
    asc: 'Fewest to most',
    desc: 'Most to fewest'
  }
};

export default async function AdminMembersPage({ searchParams }) {
  const sortParam = typeof searchParams?.sort === 'string' ? searchParams.sort : '';
  const directionParam = typeof searchParams?.direction === 'string' ? searchParams.direction : '';
  const sortField = sortParam === 'events' ? 'events' : 'joined';
  const sortDirection =
    directionParam === 'asc' || directionParam === 'desc'
      ? directionParam
      : defaultDirections[sortField];

  const members = await getMembers();
  const consentColumns = [
    { key: 'generalPhotoConsent', Icon: FaCamera, label: 'General' },
    { key: 'groupFaceConsent', Icon: FaPeopleGroup, label: 'Group' },
    { key: 'otherFaceConsent', Icon: FaPerson, label: 'Other' },
    { key: 'taggingConsent', Icon: FaUserTag, label: 'Tagging' }
  ];

  const sortMultiplier = sortDirection === 'asc' ? 1 : -1;
  const compareMembers = (a, b) => {
    let diff;
    if (sortField === 'events') {
      diff = a._count.eventsSignedUp - b._count.eventsSignedUp;
    } else {
      diff = a.createdAt.getTime() - b.createdAt.getTime();
    }
    if (diff === 0) {
      diff = a.createdAt.getTime() - b.createdAt.getTime();
    }
    return diff * sortMultiplier;
  };

  const sortMembers = (list) => [...list].sort(compareMembers);
  const registeredMembers = sortMembers(members.filter((member) => !member.isPlaceholder));
  const placeholderMembers = sortMembers(members.filter((member) => member.isPlaceholder));

  const buildFieldHref = (field) => {
    const params = new URLSearchParams();
    params.set('sort', field);
    const direction = sortField === field ? sortDirection : defaultDirections[field];
    params.set('direction', direction);
    return `/admin/members?${params.toString()}`;
  };

  const buildDirectionHref = () => {
    const params = new URLSearchParams();
    params.set('sort', sortField);
    params.set('direction', sortDirection === 'asc' ? 'desc' : 'asc');
    return `/admin/members?${params.toString()}`;
  };

  const sortFieldLabel = (field) => (field === 'events' ? 'Events attended' : 'Joined date');
  const directionLabel = directionLabels[sortField][sortDirection];

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.backLink}>
          ← Back to admin
        </Link>
        <h1>Member directory</h1>
        <p>Review all registered gents, their consent preferences, and private reference photos.</p>
      </header>
      <section className={styles.placeholderSection}>
        <AdminPlaceholderForm />
      </section>
      <div className={styles.controls}>
        <span className={styles.sortLabel}>Sort members by</span>
        <Link
          href={buildFieldHref('joined')}
          className={`${styles.sortButton} ${sortField === 'joined' ? styles.sortButtonActive : ''}`}
        >
          {sortFieldLabel('joined')}
        </Link>
        <Link
          href={buildFieldHref('events')}
          className={`${styles.sortButton} ${sortField === 'events' ? styles.sortButtonActive : ''}`}
        >
          {sortFieldLabel('events')}
        </Link>
        <Link href={buildDirectionHref()} className={styles.sortDirectionButton}>
          {directionLabel}
        </Link>
      </div>
      <MemberTable
        title="Registered members"
        members={registeredMembers}
        emptyMessage="No registered members yet."
        consentColumns={consentColumns}
      />
      <MemberTable
        title="Placeholder profiles"
        members={placeholderMembers}
        emptyMessage="No placeholder profiles available."
        consentColumns={consentColumns}
      />
    </main>
  );
}

function MemberTable({ title, members, emptyMessage, consentColumns }) {
  return (
    <section className={styles.groupSection}>
      <header className={styles.groupHeader}>
        <h2>{title}</h2>
        <span className={styles.groupMeta}>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </span>
      </header>
      {members.length > 0 ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Profile</th>
                <th>Member</th>
                <th>Contact</th>
                <th>Photo consent</th>
                <th>Events</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <MemberRow key={member.id} member={member} consentColumns={consentColumns} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.emptyNotice}>{emptyMessage}</p>
      )}
    </section>
  );
}

function MemberRow({ member, consentColumns }) {
  const displayName = getAdminDisplayName(member);
  const slug = member.instagramHandle || member.id;
  const eventCount = member._count?.eventsSignedUp ?? 0;
  const avatarInitial = displayName.charAt(0) || member.firstName?.charAt(0) || '?';

  return (
    <tr>
      <td className={styles.avatarCell} data-label="Profile">
        {member.profilePhotoUrl ? (
          <Image
            src={member.profilePhotoUrl}
            alt={`Reference for ${displayName}`}
            width={56}
            height={56}
            className={styles.avatar}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>{avatarInitial}</div>
        )}
      </td>
      <td className={styles.nameCell} data-label="Member">
        <Link href={`/admin/members/${slug}`} className={styles.nameLink}>
          <span className={styles.name}>{displayName}</span>
          <span className={styles.handle}>@{member.instagramHandle || 'no-instagram'}</span>
          <span className={styles.subtle}>
            {member.shareFirstName ? 'Shares first name' : 'Prefers alias'}
          </span>
          {member.isPlaceholder && <span className={styles.placeholderBadge}>Placeholder</span>}
        </Link>
      </td>
      <td data-label="Contact">
        <div className={styles.contactBlock}>
          <span>{member.email}</span>
          {member.phoneNumber && <span className={styles.subtle}>{member.phoneNumber}</span>}
        </div>
      </td>
      <td data-label="Photo consent">
        <div className={styles.consentRow}>
          {consentColumns.map(({ key, Icon, label }) => {
            const value = member[key];
            return (
              <span
                key={key}
                className={`${styles.consentPill} ${value ? styles.consentYes : styles.consentNo}`}
                title={`${label}: ${value ? 'Yes' : 'No'}`}
              >
                <Icon aria-hidden className={styles.consentIcon} />
                <span>{value ? 'Yes' : 'No'}</span>
                <span className={styles.srOnly}>{`${label}: ${value ? 'Yes' : 'No'}`}</span>
              </span>
            );
          })}
        </div>
      </td>
      <td data-label="Events">{eventCount}</td>
      <td data-label="Joined">{new Date(member.createdAt).toLocaleDateString('en-GB')}</td>
    </tr>
  );
}

function getAdminDisplayName(member) {
  const preferred = member.preferredName?.trim();
  const first = member.firstName?.trim();
  if (member.shareFirstName === false) {
    return preferred || first || member.instagramHandle || 'Member';
  }
  return preferred || first || member.instagramHandle || 'Member';
}
