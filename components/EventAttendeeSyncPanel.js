'use client';

import { useMemo, useState } from 'react';
import styles from './EventAttendeeSyncPanel.module.css';

function normaliseUsername(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/^@+/, '').toLowerCase();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatListItem(item) {
  if (typeof item === 'string') {
    return item;
  }
  if (item && typeof item === 'object') {
    const username = item.username || item.handle || item.user || item.instagramHandle || '';
    const reason = item.error || item.reason || item.message || '';
    const compact = [username, reason].filter(Boolean).join(': ');
    if (compact) {
      return compact;
    }
    try {
      return JSON.stringify(item);
    } catch {
      return String(item);
    }
  }
  return String(item);
}

function formatUsernameItem(item) {
  if (typeof item !== 'string') {
    return formatListItem(item);
  }
  const normalised = normaliseUsername(item);
  return normalised ? `@${normalised}` : item;
}

async function postSyncAttendees(payload) {
  const response = await fetch('/sync-attendees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = data?.error || data?.message || 'Sync request failed.';
    throw new Error(`Sync failed (${response.status}): ${reason}`);
  }
  return data;
}

export default function EventAttendeeSyncPanel({ event, attendees = [], isAdmin = false }) {
  const [checkResult, setCheckResult] = useState(null);
  const [addResult, setAddResult] = useState(null);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [hasAttemptedSync, setHasAttemptedSync] = useState(false);

  const threadId = event?.threadId?.trim() || '';
  const attendeeUsernames = useMemo(() => {
    const values = attendees.map((attendee) => normaliseUsername(attendee?.user?.instagramHandle));
    return Array.from(new Set(values.filter(Boolean)));
  }, [attendees]);

  if (!isAdmin) {
    return null;
  }

  const isLoading = phase === 'checking' || phase === 'adding';
  const missingFromThread = toArray(checkResult?.missingFromThread).map(formatUsernameItem);
  const addedUsernames = toArray(addResult?.addedUsernames).map(formatUsernameItem);
  const addedUserIds = toArray(addResult?.addedUserIds).map(formatListItem);
  const failedItems = [
    ...(error ? [error] : []),
    ...toArray(checkResult?.resolveErrors),
    ...toArray(addResult?.resolveErrors)
  ].map(formatListItem);

  const handleCheckAndAdd = async () => {
    setError(null);
    setCheckResult(null);
    setAddResult(null);

    if (!threadId) {
      setError('No Instagram thread linked to this event.');
      return;
    }

    if (!attendeeUsernames.length) {
      setError('No attendee usernames available to sync.');
      return;
    }

    const basePayload = {
      threadId,
      attendees: attendeeUsernames
    };

    setHasAttemptedSync(true);
    setPhase('checking');
    try {
      const checked = await postSyncAttendees({ ...basePayload, addMissing: false });
      setCheckResult(checked);

      const missingCount = Number(checked?.missingCount) || 0;
      if (missingCount > 0) {
        const confirmed = window.confirm(
          `Add ${missingCount} missing attendees to this Instagram thread?`
        );
        if (confirmed) {
          setPhase('adding');
          const added = await postSyncAttendees({ ...basePayload, addMissing: true });
          setAddResult(added);
        }
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to sync attendees right now.');
    } finally {
      setPhase('idle');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3>Instagram thread sync</h3>
        <p>Check current attendees against this event and optionally add any missing usernames.</p>
      </div>
      <button
        type="button"
        className={styles.syncButton}
        disabled={isLoading}
        onClick={handleCheckAndAdd}
      >
        {phase === 'checking'
          ? 'Checking…'
          : phase === 'adding'
            ? 'Adding…'
            : 'Check & Add Missing Attendees'}
      </button>
      {isLoading && (
        <p className={styles.loading}>
          {phase === 'adding' ? 'Adding missing attendees…' : 'Checking attendee sync…'}
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {hasAttemptedSync && (
        <div className={styles.results}>
          <section className={styles.section}>
            <h4>Checked</h4>
            <ul>
              <li>Thread ID: {threadId || '—'}</li>
              <li>Attendees submitted: {attendeeUsernames.length}</li>
              <li>Thread member count: {checkResult?.memberCount ?? '—'}</li>
            </ul>
          </section>
          <section className={styles.section}>
            <h4>Missing</h4>
            <p>Missing count: {checkResult?.missingCount ?? '—'}</p>
            {missingFromThread.length > 0 ? (
              <ul>
                {missingFromThread.map((item) => (
                  <li key={`missing-${item}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>None.</p>
            )}
          </section>
          <section className={styles.section}>
            <h4>Added</h4>
            <p>Added usernames: {addedUsernames.length}</p>
            {addedUsernames.length > 0 && (
              <ul>
                {addedUsernames.map((item) => (
                  <li key={`added-user-${item}`}>{item}</li>
                ))}
              </ul>
            )}
            <p>Added user IDs: {addedUserIds.length}</p>
            {addedUserIds.length > 0 && (
              <ul>
                {addedUserIds.map((item) => (
                  <li key={`added-id-${item}`}>{item}</li>
                ))}
              </ul>
            )}
          </section>
          <section className={styles.section}>
            <h4>Failed</h4>
            {failedItems.length > 0 ? (
              <ul>
                {failedItems.map((item, index) => (
                  <li key={`failed-${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>None.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
