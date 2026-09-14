'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function EventCard({ event, variant = 'list' }) {
  if (!event) {
    return null;
  }

  const isCondensed = variant === 'condensed';
  const startDate = event.startTime ? new Date(event.startTime) : null;
  const endDate = event.endTime ? new Date(event.endTime) : null;

  const schedule = startDate
    ? `${format(startDate, 'MMMM d, yyyy')} · ${format(startDate, 'h:mmaaa')}${
        endDate ? ` - ${format(endDate, 'h:mmaaa')}` : ''
      }`
    : 'Date TBA';

  return (
    <Link
      href={`/events/${event.slug}`}
      className={clsx('event-card', `event-card-${variant}`, isCondensed && 'event-card-condensed')}
    >
      <div
        className="event-card-meta"
        style={{
          '--event-primary': event.primaryColor || 'var(--color-gold)',
          '--event-secondary': event.secondaryColor || 'var(--color-slate)',
          '--event-accent': event.accentColor || 'var(--color-amber)'
        }}
      >
        <div className="event-status">
          <span>{schedule}</span>
        </div>
        <h3>{event.title}</h3>
        {event.subtitle && <p className="event-subtitle">{event.subtitle}</p>}
        {event.description && (
          <p className="event-description">
            {event.description.length > 140 ? `${event.description.slice(0, 140)}…` : event.description}
          </p>
        )}
        <div className="event-footer">
          <span className="event-location">{event.location || 'Location TBA'}</span>
          <span className="event-cta">View details</span>
        </div>
      </div>
      <style jsx>{`
        .event-card {
          display: block;
          border-radius: 24px;
          padding: 1.65rem;
          background: rgba(19, 30, 48, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: transform 0.2s ease, border 0.2s ease, box-shadow 0.2s ease;
        }
        .event-card:hover {
          transform: translateY(-6px);
          border-color: rgba(255, 212, 96, 0.5);
          box-shadow: 0 20px 40px rgba(10, 18, 31, 0.45);
        }
        .event-card-condensed {
          padding: 1.25rem;
        }
        .event-card-condensed .event-status {
          font-size: 0.72rem;
        }
        .event-card-condensed h3 {
          font-size: 1.2rem;
        }
        .event-card-condensed .event-description {
          margin-top: 0.25rem;
        }
        .event-card-condensed .event-footer {
          margin-top: 0.85rem;
        }
        .event-card-meta {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }
        .event-status {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.28em;
          color: var(--event-accent);
        }
        h3 {
          color: var(--event-primary);
          font-size: 1.4rem;
          margin-bottom: 0.3rem;
        }
        .event-subtitle {
          margin: 0;
          opacity: 0.75;
          font-weight: 600;
        }
        .event-description {
          margin: 0.35rem 0 0;
          opacity: 0.75;
          line-height: 1.5;
        }
        .event-footer {
          margin-top: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .event-location {
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.6;
        }
        .event-cta {
          padding: 0.5rem 1.2rem;
          border-radius: 999px;
          font-size: 0.75rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.08);
          color: var(--event-primary);
        }
        .event-card-hero {
          padding: 2rem;
          background: linear-gradient(135deg, rgba(255, 212, 96, 0.2), rgba(30, 46, 70, 0.85));
        }
      `}</style>
    </Link>
  );
}
