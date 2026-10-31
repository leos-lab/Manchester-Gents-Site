import Link from 'next/link';
import clsx from 'clsx';
import { format } from 'date-fns';
import styles from './EventCard.module.css';

// Photo-led event card. variant: "feature" (large, used for the next event),
// "list" (default grid card) or "condensed" (past events, smaller photo).
export default function EventCard({ event, variant = 'list', status }) {
  if (!event) return null;
  const start = event.startTime ? new Date(event.startTime) : null;
  const accent = event.accentColor || event.primaryColor || null;
  const variantClass =
    variant === 'feature' || variant === 'hero' ? styles.feature : variant === 'condensed' ? styles.condensed : styles.list;

  return (
    <Link
      href={`/events/${event.slug}`}
      className={clsx(styles.card, variantClass)}
      style={accent ? { '--event-accent': accent } : undefined}
    >
      <div className={styles.photo}>
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className={styles.photoFallback} style={event.backgroundColor ? { background: event.backgroundColor } : undefined}>
            <span className="heading-font">MG</span>
          </div>
        )}
        {start ? (
          <time className={styles.date} dateTime={start.toISOString()}>
            <span className={styles.dateMonth}>{format(start, 'MMM')}</span>
            <span className={styles.dateDay}>{format(start, 'd')}</span>
          </time>
        ) : null}
        {status ? <span className={styles.status}>{status}</span> : null}
      </div>
      <div className={styles.body}>
        <h3 className={clsx('heading-font', styles.title)}>{event.title}</h3>
        {event.subtitle && variant !== 'condensed' ? <p className={styles.subtitle}>{event.subtitle}</p> : null}
        <p className={styles.meta}>
          {start ? `${format(start, 'EEEE d MMMM')}, ${format(start, 'h:mmaaa')}` : 'Date to be announced'}
          {event.location ? <span className={styles.location}>{event.location}</span> : null}
        </p>
      </div>
    </Link>
  );
}
