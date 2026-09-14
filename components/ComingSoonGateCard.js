'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import styles from './ComingSoonGateCard.module.css';

function toInputValue(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localMs = date.getTime() - offset * 60 * 1000;
  return new Date(localMs).toISOString().slice(0, 16);
}

function toIsoString(localInputValue) {
  if (!localInputValue) return null;
  const date = new Date(localInputValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDisplay(isoString) {
  if (!isoString) return 'No auto-disable scheduled';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function describeSchedule(enabled, disableAtIso) {
  if (!enabled) {
    return 'Gate is off — visitors see the site.';
  }
  if (!disableAtIso) {
    return 'Gate is on until you turn it off.';
  }
  const date = new Date(disableAtIso);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) {
    return 'Gate is on but the schedule looks invalid. Please set a valid time or clear it.';
  }
  const inPast = !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
  if (inPast) {
    return 'Gate schedule has passed; visitors see the site.';
  }
  return `Gate drops at ${formatDisplay(disableAtIso)} (${date.toISOString()}).`;
}

export default function ComingSoonGateCard({ initialConfig }) {
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? true);
  const [disableAtInput, setDisableAtInput] = useState(
    toInputValue(initialConfig?.disableAt)
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const disableAtIso = useMemo(() => toIsoString(disableAtInput), [disableAtInput]);

  const active = useMemo(() => {
    if (!enabled) return false;
    if (!disableAtIso) return true;
    const date = new Date(disableAtIso);
    if (Number.isNaN(date.getTime())) return true;
    return date.getTime() > Date.now();
  }, [enabled, disableAtIso]);

  const summary = useMemo(() => describeSchedule(enabled, disableAtIso), [enabled, disableAtIso]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/admin/coming-soon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          disableAt: disableAtIso
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update the gate right now.');
      }
      setEnabled(Boolean(data.enabled));
      setDisableAtInput(toInputValue(data.disableAt));
      setStatus({
        type: 'success',
        message: data.active
          ? 'Coming-soon gate is active.'
          : 'Coming-soon gate is off — launch is open.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to update the gate right now.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${styles.securityCard} ${styles.gateCard} glass-panel`}>
      <div className={styles.gateHeader}>
        <div>
          <p className={styles.securityEyebrow}>Coming-soon gate</p>
          <h2>Launch lock & schedule</h2>
          <p className={styles.gateSubtitle}>
            Toggle the gate or set a drop time. Times use your local timezone and save as UTC.
          </p>
        </div>
        <span
          className={clsx(
            styles.gateStatus,
            active ? styles.statusOn : styles.statusOff
          )}
        >
          {active ? 'Gate ON' : 'Gate OFF'}
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
            <p className={styles.toggleLabel}>Enable coming-soon gate</p>
            <p className={styles.toggleHint}>
              When enabled, visitors are redirected to /coming-soon unless they are admins.
            </p>
          </div>
        </label>

        <div className={styles.inputRow}>
          <div className={styles.inputLabelRow}>
            <label htmlFor="disableAt">Auto-disable at</label>
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => setDisableAtInput('')}
            >
              Clear
            </button>
          </div>
          <input
            id="disableAt"
            type="datetime-local"
            className={styles.input}
            value={disableAtInput}
            onChange={(event) => setDisableAtInput(event.target.value)}
          />
          <p className={styles.hint}>
            Optional. Leave blank to keep the gate on until you manually switch it off.
          </p>
          <p className={styles.hint}>
            Saves as UTC. Example: 18:00 UK (BST) equals 17:00 UTC.
          </p>
        </div>

        <div className={styles.gateActions}>
          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Saving…' : 'Save gate settings'}
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

      <div className={styles.gateSummary}>
        <p className={styles.summaryLabel}>Current state</p>
        <p className={styles.summaryText}>{summary}</p>
        <p className={styles.summaryDetail}>
          Auto-disable at: {formatDisplay(disableAtIso)}
        </p>
      </div>
    </div>
  );
}
