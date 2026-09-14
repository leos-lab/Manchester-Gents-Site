'use client';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

function getUserLabel(user = {}) {
  const preferred = user.preferredName?.trim();
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  const handle = user.instagramHandle || '';
  let base = preferred || first || '';
  if (!base && first && last) {
    base = `${first} ${last}`.trim();
  }
  if (!base && first) {
    base = first;
  }
  if (!base) {
    return `@${handle}`;
  }
  return `${base} (@${handle})`;
}

export default function AdminAddToEventForm({ events = [], users = [] }) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const timeA = a.startTime ? new Date(a.startTime).getTime() : Number.POSITIVE_INFINITY;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : Number.POSITIVE_INFINITY;
      if (timeA === timeB) {
        return (a.title || '').localeCompare(b.title || '');
      }
      return timeA - timeB;
    });
  }, [events]);

  const [userList, setUserList] = useState(users);
  useEffect(() => {
    setUserList(users);
  }, [users]);

  const sortedUsers = useMemo(() => {
    return [...userList].sort((a, b) => {
      const nameA = getUserLabel(a).toLowerCase();
      const nameB = getUserLabel(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [userList]);

  const [formState, setFormState] = useState({
    eventId: sortedEvents[0]?.id || '',
    search: ''
  });
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkIsSubmitting, setBulkIsSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  const [bulkSuccess, setBulkSuccess] = useState(null);

  useEffect(() => {
    setFormState((prev) => {
      if (!sortedEvents.length) {
        return { ...prev, eventId: '' };
      }
      if (sortedEvents.some((event) => event.id === prev.eventId)) {
        return prev;
      }
      return { ...prev, eventId: sortedEvents[0].id };
    });
  }, [sortedEvents]);

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    setError(null);
    setSuccess(null);
    setBulkError(null);
    setBulkSuccess(null);
  };

  const hasEvents = sortedEvents.length > 0;
  const hasUsers = sortedUsers.length > 0;
  const lowercaseQuery = formState.search.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!lowercaseQuery) {
      return sortedUsers;
    }
    return sortedUsers.filter((user) =>
      getUserLabel(user).toLowerCase().includes(lowercaseQuery)
    );
  }, [sortedUsers, lowercaseQuery]);

  const toggleUser = (userId) => () => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    setSelectedUserIds([]);
  }, [formState.eventId]);

  const handleBulkInputChange = (event) => {
    setBulkInput(event.target.value);
    setBulkError(null);
    setBulkSuccess(null);
  };

  const upsertUsers = (incoming = []) => {
    if (!incoming.length) {
      return;
    }
    setUserList((prev) => {
      const map = new Map(prev.map((user) => [user.id, user]));
      for (const user of incoming) {
        if (user?.id) {
          map.set(user.id, user);
        }
      }
      return Array.from(map.values());
    });
  };

  const handleBulkSubmit = async () => {
    setBulkError(null);
    setBulkSuccess(null);

    if (!formState.eventId) {
      setBulkError('Select an event before processing the table.');
      return;
    }
    if (!bulkInput.trim()) {
      setBulkError('Paste at least one row before processing.');
      return;
    }

    setBulkIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/events/${formState.eventId}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeholderTable: bulkInput })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to process the table for this event.');
      }

      const stats = data?.stats || {};
      upsertUsers([
        ...(stats.createdPlaceholders || []),
        ...(stats.updatedPlaceholders || []),
        ...(stats.matchedPlaceholders || []),
        ...(stats.matchedMembers || [])
      ]);

      const addedCount = stats.added?.length || 0;
      const alreadyCount = stats.already?.length || 0;
      const createdCount = stats.createdPlaceholders?.length || 0;
      const updatedCount = stats.updatedPlaceholders?.length || 0;
      const skippedCount = stats.skipped?.length || 0;

      const messageParts = [];
      if (addedCount) {
        messageParts.push(`${addedCount} added to the guest list`);
      }
      if (alreadyCount) {
        messageParts.push(`${alreadyCount} already listed`);
      }
      if (createdCount) {
        messageParts.push(`${createdCount} placeholders created`);
      }
      if (updatedCount) {
        messageParts.push(`${updatedCount} updated`);
      }
      if (skippedCount) {
        messageParts.push(`${skippedCount} skipped`);
      }
      setBulkSuccess(messageParts.join('. ') || 'Table processed successfully.');
      setBulkInput('');
    } catch (err) {
      setBulkError(err.message);
    } finally {
      setBulkIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setBulkError(null);
    setBulkSuccess(null);

    if (!formState.eventId || selectedUserIds.length === 0) {
      setError('Please select an event and at least one member.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/events/${formState.eventId}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUserIds })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to add attendees to this event.');
      }
      const created = data?.created?.length ?? selectedUserIds.length;
      const skipped = data?.skipped?.length ?? 0;
      let message = `${created} member${created === 1 ? '' : 's'} added to the guest list.`;
      if (skipped) {
        message += ` ${skipped} already on the list.`;
      }
      setSuccess(message);
      setSelectedUserIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="add-to-event-form glass-panel" onSubmit={handleSubmit}>
      <div className="form-head">
        <span className="heading-font">Add member to an event</span>
        <p>
          Drop a member or placeholder into a guest list. Perfect for backfilling historical
          attendance or saving a seat manually.
        </p>
        {!hasEvents && <p className="empty-note">Create an event first to add attendees.</p>}
        {!hasUsers && <p className="empty-note">No members or placeholders available yet.</p>}
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Event</span>
          <select
            value={formState.eventId}
            onChange={handleChange('eventId')}
            required
            disabled={!hasEvents}
          >
            <option value="" disabled>
              Select an event
            </option>
            {sortedEvents.map((event) => {
              const start = event.startTime ? new Date(event.startTime) : null;
              const label = start ? `${event.title} • ${format(start, 'd MMM yyyy')}` : event.title;
              return (
                <option key={event.id} value={event.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>
        <label className="field">
          <span>Search members</span>
          <input
            type="text"
            placeholder="Search by name or handle"
            value={formState.search}
            onChange={handleChange('search')}
            disabled={!hasUsers}
          />
        </label>
      </div>
      <div className="pill-list">
        {filteredUsers.map((user) => {
          const label = getUserLabel(user);
          const isActive = selectedUserIds.includes(user.id);
          return (
            <button
              key={user.id}
              type="button"
              className={`pill ${isActive ? 'pill-active' : ''}`}
              onClick={toggleUser(user.id)}
              disabled={!hasUsers}
            >
              {label}
              {user.isPlaceholder && <span className="pill-tag">Placeholder</span>}
            </button>
          );
        })}
        {hasUsers && filteredUsers.length === 0 && (
          <p className="no-results">No members match that search.</p>
        )}
      </div>
      <div className="bulk-import">
        <div className="bulk-head">
          <span className="heading-font">Paste placeholder table</span>
          <p>
            Paste a spreadsheet export with columns for name, Instagram handle, and consent flags to
            create or update placeholders before adding them to this event.
          </p>
        </div>
        <textarea
          value={bulkInput}
          onChange={handleBulkInputChange}
          placeholder="Name	@handle	Yes	No	No	Yes"
          rows={6}
          disabled={!hasEvents || bulkIsSubmitting}
        />
        <div className="bulk-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleBulkSubmit}
            disabled={bulkIsSubmitting || !hasEvents}
          >
            {bulkIsSubmitting ? 'Processing…' : 'Process table'}
          </button>
        </div>
        {bulkError && <p className="status status-error">{bulkError}</p>}
        {bulkSuccess && <p className="status status-success">{bulkSuccess}</p>}
      </div>
      {error && <p className="status status-error">{error}</p>}
      {success && <p className="status status-success">{success}</p>}
      <div className="actions">
        <button
          type="submit"
          className="primary-btn"
          disabled={isSubmitting || !hasEvents || !hasUsers || selectedUserIds.length === 0}
        >
          {isSubmitting ? 'Adding…' : 'Add to event'}
        </button>
      </div>
      <style jsx>{`
        .add-to-event-form {
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
          padding: clamp(1.75rem, 5vw, 2.5rem);
          border-radius: 24px;
        }
        .form-head {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .form-head p {
          margin: 0;
          opacity: 0.72;
          line-height: 1.6;
        }
        .empty-note {
          margin: 0;
          font-size: 0.82rem;
          color: #ffea9f;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .field span {
          font-size: 0.75rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          opacity: 0.7;
        }
        select,
        input {
          border-radius: 12px;
          padding: 0.75rem 1rem;
          background: rgba(15, 26, 40, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: inherit;
        }
        select:disabled,
        input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        select:focus,
        input:focus {
          outline: none;
          border-color: var(--color-gold);
        }
        .pill-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          max-height: 260px;
          overflow-y: auto;
          padding: 0.35rem;
          border-radius: 18px;
          background: rgba(15, 26, 40, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.2rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(16, 27, 44, 0.7);
          color: inherit;
          letter-spacing: 0.06em;
          font-size: 0.82rem;
        }
        .pill:hover:not(:disabled) {
          border-color: rgba(255, 212, 96, 0.4);
        }
        .pill:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pill-active {
          background: linear-gradient(120deg, var(--color-gold), var(--color-amber));
          color: #0f1727;
          border: none;
        }
        .pill-tag {
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          background: rgba(15, 23, 39, 0.25);
          border: 1px solid rgba(15, 23, 39, 0.4);
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .no-results {
          margin: 0;
          opacity: 0.6;
        }
        .bulk-import {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          padding: 1rem;
          border-radius: 18px;
          background: rgba(15, 26, 40, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .bulk-head {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .bulk-head p {
          margin: 0;
          font-size: 0.85rem;
          opacity: 0.7;
          line-height: 1.5;
        }
        textarea {
          width: 100%;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          background: rgba(15, 26, 40, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: inherit;
          font-family: inherit;
          font-size: 0.95rem;
          resize: vertical;
          min-height: 160px;
        }
        textarea:focus {
          outline: none;
          border-color: var(--color-gold);
        }
        textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .bulk-actions {
          display: flex;
          justify-content: flex-end;
        }
        .secondary-btn {
          padding: 0.55rem 1.4rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(15, 27, 44, 0.4);
          color: inherit;
          letter-spacing: 0.08em;
          font-size: 0.82rem;
          text-transform: uppercase;
        }
        .secondary-btn:hover:not(:disabled) {
          border-color: rgba(255, 212, 96, 0.4);
        }
        .secondary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .bulk-actions .secondary-btn {
          padding-inline: 1.6rem;
        }
        .primary-btn {
          padding: 0.6rem 1.6rem;
          border-radius: 999px;
          border: none;
          background: linear-gradient(120deg, var(--color-gold), var(--color-amber));
          color: #0f1727;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          box-shadow: 0 12px 24px rgba(255, 212, 96, 0.25);
        }
        .primary-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }
        .status {
          margin: 0;
          font-size: 0.82rem;
        }
        .status-error {
          color: #ff9f9f;
        }
        .status-success {
          color: #9affc7;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
        }
        @media (max-width: 720px) {
          .actions {
            justify-content: center;
          }
          .primary-btn {
            width: 100%;
            text-align: center;
          }
          .bulk-actions {
            justify-content: center;
          }
          .bulk-actions .secondary-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </form>
  );
}
