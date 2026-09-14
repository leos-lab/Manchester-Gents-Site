'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import styles from './AdminMemberEventManager.module.css';

function buildOptionLabel(event) {
  const title = event.title || 'Untitled event';
  if (!event.startTime) {
    return `${title} — Schedule TBA`;
  }
  try {
    return `${title} — ${format(new Date(event.startTime), 'd MMM yyyy, HH:mm')}`;
  } catch {
    return `${title} — Schedule TBA`;
  }
}

export default function AdminMemberEventManager({
  memberId,
  memberName,
  events = [],
  existingEventIds = []
}) {
  const router = useRouter();
  const eventOptions = useMemo(() => {
    const existing = new Set(existingEventIds);
    return events.map((event) => ({
      value: event.id,
      label: buildOptionLabel(event),
      disabled: existing.has(event.id)
    }));
  }, [events, existingEventIds]);

  const firstAvailable = useMemo(
    () => eventOptions.find((option) => !option.disabled) || eventOptions[0] || null,
    [eventOptions]
  );

  const [selectedEventId, setSelectedEventId] = useState(firstAvailable?.value || '');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectChange = (event) => {
    setSelectedEventId(event.target.value);
    setStatus({ type: null, message: '' });
  };

  useEffect(() => {
    if (!eventOptions.length) {
      setSelectedEventId('');
      return;
    }
    if (!selectedEventId) {
      setSelectedEventId(firstAvailable?.value || '');
      return;
    }
    const picked = eventOptions.find((option) => option.value === selectedEventId);
    if (!picked || picked.disabled) {
      setSelectedEventId(firstAvailable?.value || '');
    }
  }, [eventOptions, firstAvailable, selectedEventId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedEventId) {
      setStatus({ type: 'error', message: 'Select an event before adding this member.' });
      return;
    }
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });
    try {
      const response = await fetch(`/api/admin/events/${selectedEventId}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [memberId] })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to add this member to the event.');
      }
      setStatus({
        type: 'success',
        message: `${memberName} added to the guest list.`
      });
      router.refresh();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to add this member to the event.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (eventOptions.length === 0) {
    return <p className={styles.note}>No events available yet. Create an event first.</p>;
  }

  const hasAvailable = eventOptions.some((option) => !option.disabled);

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label}>
        Event
        <select
          value={selectedEventId}
          onChange={handleSelectChange}
          className={styles.select}
        >
          {eventOptions.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
              {option.disabled ? ' (already attending)' : ''}
            </option>
          ))}
        </select>
      </label>
      {!hasAvailable && (
        <p className={styles.note}>
          Already attending every available event. Select a different event once one is added.
        </p>
      )}
      {status.message && (
        <p className={status.type === 'error' ? styles.error : styles.success}>{status.message}</p>
      )}
      <button
        type="submit"
        className={styles.submit}
        disabled={isSubmitting || !selectedEventId || !hasAvailable}
      >
        {isSubmitting ? 'Adding…' : 'Add to event'}
      </button>
    </form>
  );
}
