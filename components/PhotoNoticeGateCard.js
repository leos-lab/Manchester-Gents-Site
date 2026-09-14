'use client';

import { useState } from 'react';
import clsx from 'clsx';
import styles from './ComingSoonGateCard.module.css';

export default function PhotoNoticeGateCard({ initialConfig }) {
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/admin/photo-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update the notice right now.');
      }
      setEnabled(Boolean(data.enabled));
      setStatus({
        type: 'success',
        message: data.enabled
          ? 'Photography notice is showing on events and at login.'
          : 'Photography notice is hidden.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to update the notice right now.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${styles.securityCard} ${styles.gateCard} glass-panel`}>
      <div className={styles.gateHeader}>
        <div>
          <p className={styles.securityEyebrow}>Photography notice</p>
          <h2>Photo consent notice</h2>
          <p className={styles.gateSubtitle}>
            Shown on event pages, at RSVP, and as a one-time acknowledgment gate for members
            after they log in.
          </p>
        </div>
        <span
          className={clsx(styles.gateStatus, enabled ? styles.statusOn : styles.statusOff)}
        >
          {enabled ? 'Notice ON' : 'Notice OFF'}
        </span>
      </div>

      <form className={styles.gateForm} onSubmit={handleSubmit}>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <div>
            <p className={styles.toggleLabel}>Enable photography notice</p>
            <p className={styles.toggleHint}>
              Turn off if you need to remove the photo notice sitewide without any code changes.
            </p>
          </div>
        </label>

        <div className={styles.gateActions}>
          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Saving…' : 'Save notice settings'}
          </button>
          {status.message && (
            <p
              className={clsx(
                styles.statusText,
                status.type === 'success' && styles.statusSuccess,
                status.type === 'error' && styles.statusError
              )}
            >
              {status.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
