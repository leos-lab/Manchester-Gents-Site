'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function ChatReportActions({ reportId, canBan = false, unbanUserId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  async function run(label, url, init, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(url, init);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong.');
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (unbanUserId) {
    return (
      <button
        type="button"
        className={styles.button}
        disabled={Boolean(busy)}
        onClick={() => run('unban', `/api/admin/members/${unbanUserId}/chat-ban`, { method: 'DELETE' })}
      >
        {busy ? 'Unbanning…' : 'Unban'}
      </button>
    );
  }

  const act = (action, confirmText) =>
    run(
      action,
      `/api/admin/chat-reports/${reportId}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) },
      confirmText
    );

  return (
    <div className={styles.actions}>
      <button type="button" className={`${styles.button} ${styles.danger}`} disabled={Boolean(busy)} onClick={() => act('remove', 'Delete this message for everyone?')}>
        {busy === 'remove' ? 'Removing…' : 'Remove message'}
      </button>
      {canBan ? (
        <button
          type="button"
          className={`${styles.button} ${styles.danger}`}
          disabled={Boolean(busy)}
          onClick={() => act('remove_and_ban', 'Delete this message and stop this member posting in any chat?')}
        >
          {busy === 'remove_and_ban' ? 'Working…' : 'Remove & ban from chat'}
        </button>
      ) : null}
      <button type="button" className={styles.button} disabled={Boolean(busy)} onClick={() => act('dismiss')}>
        {busy === 'dismiss' ? 'Dismissing…' : 'Dismiss'}
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
