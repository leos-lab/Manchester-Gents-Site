'use client';

import { useState } from 'react';
import clsx from 'clsx';

export default function InvalidateSessionsButton({
  buttonClassName,
  statusClassName,
  successClassName,
  errorClassName
}) {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleClick = async () => {
    const confirmed = window.confirm(
      'Sign everyone out now? All members and admins will need to log in again.'
    );
    if (!confirmed) {
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch('/api/admin/sessions/invalidate', {
        method: 'POST'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to sign everyone out.');
      }
      setStatus('success');
      setMessage('Done. Everyone will be prompted to log in again.');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Unable to sign everyone out.');
    }
  };

  return (
    <div className="invalidate-sessions">
      <button
        type="button"
        className={buttonClassName}
        onClick={handleClick}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Working…' : 'Sign everyone out'}
      </button>
      {message && (
        <p
          className={clsx(
            statusClassName,
            status === 'success' && successClassName,
            status === 'error' && errorClassName
          )}
        >
          {message}
        </p>
      )}
      <style jsx>{`
        .invalidate-sessions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.35rem;
        }
      `}</style>
    </div>
  );
}
