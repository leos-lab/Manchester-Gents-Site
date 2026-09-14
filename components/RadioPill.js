'use client';

export default function RadioPill({ label, active, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`radio-pill ${active ? 'radio-pill-active' : ''}`}
    >
      {label}
      <style jsx>{`
        .radio-pill {
          padding: 0.55rem 1.4rem;
          border-radius: 999px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-size: 0.75rem;
          background: rgba(18, 30, 47, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: inherit;
          transition: all 0.15s ease;
        }
        .radio-pill-active {
          color: #0f1727;
          background: linear-gradient(120deg, var(--color-gold), var(--color-amber));
          border: none;
        }
        .radio-pill:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </button>
  );
}
