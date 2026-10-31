'use client';

import { useState } from 'react';

// Makes a password reset link for an admin to send a member by hand (valid for
// three days). After using it, the member is signed in and asked to check
// their details.
export default function AdminResetLinkButton({ userId }) {
  const [link, setLink] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${encodeURIComponent(userId)}/reset-link`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Couldn’t make a link.');
      setLink(data);
      setCopied(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
  };

  return (
    <div className="reset-link">
      <button type="button" onClick={create} disabled={busy}>
        {busy ? 'Making link…' : link ? 'Make a new link' : 'Make a password reset link'}
      </button>
      {link ? (
        <div className="reset-link__result">
          <input readOnly value={link.url} onFocus={(e) => e.target.select()} aria-label="Password reset link" />
          <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          <p>
            Works until{' '}
            {new Date(link.expiresAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            . Making a new link cancels this one.
          </p>
        </div>
      ) : null}
      {error ? <p className="reset-link__error">{error}</p> : null}
      <style jsx>{`
        .reset-link { display: grid; gap: 0.75rem; }
        .reset-link button { justify-self: start; padding: 0.6rem 1.1rem; border-radius: 999px; border: 1px solid rgba(255, 212, 96, 0.6); background: transparent; color: #ffd460; font-weight: 600; cursor: pointer; }
        .reset-link__result { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; align-items: center; }
        .reset-link__result input { width: 100%; padding: 0.6rem 0.8rem; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.06); color: #f7f4ed; }
        .reset-link__result p { grid-column: 1 / -1; margin: 0; color: rgba(247, 244, 237, 0.66); font-size: 0.9rem; }
        .reset-link__error { color: #ff6b6b; margin: 0; }
      `}</style>
    </div>
  );
}
