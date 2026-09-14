'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

function calculateTimeLeft(targetDate) {
  const total = targetDate.getTime() - new Date().getTime();
  if (total <= 0) {
    return {
      total,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    };
  }
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { total, days, hours, minutes, seconds };
}

export default function CountdownTimer({ startTime }) {
  const targetDate = useMemo(() => new Date(startTime), [startTime]);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetDate));

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const eventDateFormatted = format(targetDate, 'MMMM d, yyyy - h:mmaaa');
  const displayTime = timeLeft || { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return (
    <div className="countdown glass-panel">
      <div className="countdown-header">
        <span className="heading-font">Next Meetup</span>
        <p>{eventDateFormatted}</p>
      </div>
      <div className="timer-grid">
        <CountdownCard label="Days" value={displayTime.days} />
        <CountdownCard label="Hours" value={displayTime.hours} />
        <CountdownCard label="Minutes" value={displayTime.minutes} />
        <CountdownCard label="Seconds" value={displayTime.seconds} />
      </div>
      <style jsx>{`
        .countdown {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .countdown-header {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .countdown-header p {
          margin: 0;
          opacity: 0.7;
        }
        .timer-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(80px, 1fr));
          gap: 0.75rem;
        }
        @media (max-width: 640px) {
          .timer-grid {
            grid-template-columns: repeat(2, minmax(80px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}

function CountdownCard({ label, value }) {
  return (
    <div className="timer-card">
      <span className="timer-value">{value.toString().padStart(2, '0')}</span>
      <span className="timer-label">{label}</span>
      <style jsx>{`
        .timer-card {
          padding: 1rem;
          border-radius: 18px;
          background: rgba(17, 29, 47, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
        }
        .timer-value {
          font-size: 1.85rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--color-gold);
        }
        .timer-label {
          font-size: 0.75rem;
          letter-spacing: 0.18em;
          opacity: 0.6;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
