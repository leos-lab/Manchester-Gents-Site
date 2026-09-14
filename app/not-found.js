import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={styles.root}>
      <div className={`${styles.card} glass-panel`}>
        <span className="heading-font">404</span>
        <h1>That page is off the guest list.</h1>
        <p>Check the URL or return to the lounge to explore upcoming events.</p>
        <Link href="/" className={styles.link}>
          Return home
        </Link>
      </div>
    </main>
  );
}
