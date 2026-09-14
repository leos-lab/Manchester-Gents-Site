'use client';

import { useMemo, useState } from 'react';
import { getDisplayName } from '@/lib/displayName';
import styles from './EventAttendeeManager.module.css';

export default function EventAttendeeManager({ eventId, attendees = [] }) {
  const [list, setList] = useState(attendees);
  const [isRemoving, setIsRemoving] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((attendee) => {
      const name = getDisplayName(attendee.user)?.toLowerCase() || '';
      const handle = attendee.user.instagramHandle?.toLowerCase() || '';
      return name.includes(query) || handle.includes(query);
    });
  }, [filter, list]);

  const handleRemove = async (attendee) => {
    setError(null);
    setIsRemoving(attendee.userId);
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/attendees/${attendee.userId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Unable to remove attendee.');
      }
      setList((prev) => prev.filter((item) => item.userId !== attendee.userId));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRemoving(null);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.listHeader}>
        <h3>Current attendees</h3>
        <input
          type="search"
          className={styles.search}
          placeholder="Filter by name or handle"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <ul className={styles.attendeeList}>
        {filtered.map((attendee) => {
          const displayName = getDisplayName(attendee.user);
          const handle = `@${attendee.user.instagramHandle}`;
          return (
            <li key={attendee.userId} className={styles.attendeeRow}>
              <div className={styles.attendeeInfo}>
                <span className={styles.attendeeName}>{displayName}</span>
                <span className={styles.attendeeHandle}>{handle}</span>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleRemove(attendee)}
                disabled={isRemoving === attendee.userId}
              >
                {isRemoving === attendee.userId ? 'Removing…' : 'Remove'}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className={styles.emptyRow}>No attendees match that filter.</li>
        )}
      </ul>
    </div>
  );
}
