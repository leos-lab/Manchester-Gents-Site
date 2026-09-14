'use client';

import { useState } from 'react';

const createEmptyRow = () => ({ firstName: '', preferredName: '', instagramHandle: '' });

export default function AdminPlaceholderForm() {
  const [rows, setRows] = useState([createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (index, field) => (event) => {
    const value = event.target.value;
    setRows((prev) => {
      const next = prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      );
      const lastIndex = next.length - 1;
      const lastRow = next[lastIndex];
      const hasContent = Object.values(lastRow).some((val) => val.trim().length > 0);
      if (hasContent) {
        next.push(createEmptyRow());
      }
      return next;
    });
    setError(null);
    setSuccess(null);
  };

  const handleRemove = (index) => () => {
    setRows((prev) => {
      if (prev.length === 1) {
        return [createEmptyRow()];
      }
      const next = prev.filter((_, rowIndex) => rowIndex !== index);
      if (next.length === 0) {
        next.push(createEmptyRow());
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const payloadRows = rows
      .map((row) => ({
        firstName: row.firstName.trim(),
        preferredName: row.preferredName.trim(),
        instagramHandle: row.instagramHandle.trim().replace(/^@/, '')
      }))
      .filter((row) => row.firstName && row.instagramHandle);

    if (payloadRows.length === 0) {
      setIsSubmitting(false);
      setError('Please provide at least one placeholder member with a first name and Instagram handle.');
      return;
    }

    try {
      const response = await fetch('/api/admin/placeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: payloadRows })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to create placeholder members.');
      }
      setSuccess(`Created ${data.created?.length || 0} placeholder${data.created?.length === 1 ? '' : 's'}.`);
      if (data.skipped?.length) {
        setSuccess((prev) =>
          `${prev} Skipped ${data.skipped.length} existing handle${data.skipped.length === 1 ? '' : 's'}.`
        );
      }
      setRows([createEmptyRow()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="placeholder-form glass-panel" onSubmit={handleSubmit}>
      <div className="form-header">
        <span className="heading-font">Add placeholder members</span>
        <p>
          Create lightweight member records so you can credit attendees for past events. When a
          gent completes registration, we will upgrade their placeholder profile automatically.
        </p>
      </div>
      <div className="rows">
        {rows.map((row, index) => {
          const isLast = index === rows.length - 1;
          const isRemovable = rows.length > 1 && !isLast;
          return (
            <div key={index} className="row">
              <div className="field">
                <label>First name</label>
                <input
                  type="text"
                  value={row.firstName}
                  onChange={handleChange(index, 'firstName')}
                  placeholder="e.g. James"
                  required={!isLast}
                />
              </div>
              <div className="field">
                <label>Preferred name (optional)</label>
                <input
                  type="text"
                  value={row.preferredName}
                  onChange={handleChange(index, 'preferredName')}
                  placeholder="e.g. Jimmy"
                />
              </div>
              <div className="field">
                <label>Instagram handle</label>
                <div className="input-with-prefix">
                  <span>@</span>
                  <input
                    type="text"
                    value={row.instagramHandle.replace(/^@/, '')}
                    onChange={handleChange(index, 'instagramHandle')}
                    placeholder="manchester.gent"
                    required={!isLast}
                  />
                </div>
              </div>
              {isRemovable && (
                <button type="button" className="remove-button" onClick={handleRemove(index)}>
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="status status-error">{error}</p>}
      {success && <p className="status status-success">{success}</p>}
      <div className="actions">
        <button type="submit" className="primary-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save placeholders'}
        </button>
      </div>
      <style jsx>{`
        .placeholder-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: clamp(1.75rem, 5vw, 2.5rem);
          border-radius: 24px;
        }
        .form-header {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .form-header p {
          margin: 0;
          opacity: 0.75;
          line-height: 1.6;
        }
        .rows {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .row {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          align-items: end;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        label {
          font-size: 0.75rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.7;
        }
        input {
          border-radius: 12px;
          padding: 0.75rem 1rem;
          background: rgba(14, 24, 38, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: inherit;
        }
        input:focus {
          outline: none;
          border-color: var(--color-gold);
        }
        .input-with-prefix {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(14, 24, 38, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 0 0.85rem;
        }
        .input-with-prefix span {
          opacity: 0.6;
        }
        .input-with-prefix input {
          border: none;
          background: transparent;
          padding: 0.7rem 0;
        }
        .input-with-prefix input:focus {
          outline: none;
        }
        .remove-button {
          align-self: flex-start;
          padding: 0.6rem 1.2rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--color-gold);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.7rem;
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
        @media (max-width: 720px) {
          .row {
            grid-template-columns: 1fr;
          }
          .actions {
            justify-content: center;
          }
          .primary-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </form>
  );
}
