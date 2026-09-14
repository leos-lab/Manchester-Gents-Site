'use client';

import { useMemo, useState } from 'react';
import { getDisplayName } from '@/lib/displayName';
import styles from './CommunityChatChecklist.module.css';

function formatFriendlyDate(value) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function CommunityChatChecklist({ attendees = [], eventStartTime }) {
  const [filter, setFilter] = useState('');
  const [copiedHandle, setCopiedHandle] = useState(null);
  const [copyError, setCopyError] = useState(null);

  const rows = useMemo(() => {
    const eventStart = eventStartTime ? new Date(eventStartTime) : null;
    const unsorted = attendees.map((attendee) => {
      const user = attendee.user || {};
      const handle = user.instagramHandle || '';
      const displayName = getDisplayName(user);
      const confirmedHistory = (user.eventsSignedUp || []).filter(
        (record) => record?.event?.startTime
      );
      const mappedHistory = confirmedHistory.map((record) => ({
        date: new Date(record.event.startTime),
        title: record.event.title || record.event.slug || 'Manchester Gents event'
      }));
      const previousEvents = mappedHistory.filter((record) => {
        if (!eventStart) {
          return true;
        }
        return record.date < eventStart;
      });
      const lastPreviousEvent = previousEvents
        .slice()
        .sort((a, b) => b.date - a.date)[0] || null;

      return {
        attendeeId: attendee.id,
        userId: user.id,
        displayName,
        displayNameLower: (displayName || '').toLowerCase(),
        handle,
        handleLabel: handle ? `@${handle}` : 'No Instagram handle',
        hasHandle: Boolean(handle),
        hasAttendedBefore: previousEvents.length > 0,
        previousEventsCount: previousEvents.length,
        totalConfirmed: confirmedHistory.length,
        lastPreviousEvent,
        isPlaceholder: user.isPlaceholder
      };
    });

    return unsorted.sort((a, b) => {
      if (a.hasAttendedBefore !== b.hasAttendedBefore) {
        return a.hasAttendedBefore ? 1 : -1;
      }
      const nameA = a.displayNameLower || a.handle.toLowerCase();
      const nameB = b.displayNameLower || b.handle.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [attendees, eventStartTime]);

  const filteredRows = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter((row) => {
      return (
        row.displayNameLower.includes(query) ||
        row.handle.toLowerCase().includes(query)
      );
    });
  }, [filter, rows]);

  const needsInviteCount = rows.filter((row) => !row.hasAttendedBefore).length;
  const returningCount = rows.length - needsInviteCount;

  const handleCopy = async (handle) => {
    if (!handle) {
      return;
    }
    setCopyError(null);
    try {
      const normalised = handle.startsWith('@') ? handle : `@${handle}`;
      await navigator.clipboard.writeText(normalised);
      setCopiedHandle(handle);
      setTimeout(() => setCopiedHandle(null), 2000);
    } catch (error) {
      console.error('Copy handle failed:', error);
      setCopyError('Unable to copy that handle. Copy it manually instead.');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Needs invite</span>
          <strong>{needsInviteCount}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Already added</span>
          <strong>{returningCount}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total attendees</span>
          <strong>{rows.length}</strong>
        </div>
      </div>
      <div className={styles.controls}>
        <input
          type="search"
          className={styles.search}
          placeholder="Filter by name or handle"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        {copyError && <p className={styles.error}>{copyError}</p>}
      </div>
      <ul className={styles.list}>
        {filteredRows.map((row) => (
          <li
            key={row.userId}
            className={`${styles.item} ${
              row.hasAttendedBefore ? styles.itemReturning : styles.itemNew
            }`}
          >
            <div className={styles.itemHead}>
              <div className={styles.identity}>
                <span className={styles.name}>{row.displayName}</span>
                <span className={styles.handle}>{row.handleLabel}</span>
              </div>
              <span
                className={`${styles.badge} ${
                  row.hasAttendedBefore ? styles.badgeReturning : styles.badgeNew
                }`}
              >
                {row.hasAttendedBefore ? 'Already in chat' : 'Add to chat'}
              </span>
            </div>
            <div className={styles.itemBody}>
              {row.hasAttendedBefore ? (
                row.lastPreviousEvent ? (
                  <p>
                    Last seen {formatFriendlyDate(row.lastPreviousEvent.date)} —{' '}
                    {row.lastPreviousEvent.title}
                  </p>
                ) : (
                  <p>Previously attended an event.</p>
                )
              ) : (
                <p>This is their first Manchester Gents experience.</p>
              )}
            </div>
            <div className={styles.actions}>
              {row.hasHandle ? (
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => handleCopy(row.handle)}
                >
                  {copiedHandle === row.handle ? 'Copied' : 'Copy handle'}
                </button>
              ) : (
                <span className={styles.missingHandle}>No Instagram handle on file</span>
              )}
              <span className={styles.attendanceCount}>
                {row.totalConfirmed} total RSVP{row.totalConfirmed === 1 ? '' : 's'}
              </span>
            </div>
          </li>
        ))}
        {filteredRows.length === 0 && (
          <li className={styles.emptyState}>No attendees match that filter.</li>
        )}
      </ul>
    </div>
  );
}
