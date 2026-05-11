import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: 'Admin | Manchester Gents'
};

export default async function AdminPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>Admin control room</h1>
        <p>Jump to an admin workspace. Each section lives on its own page for easier upkeep.</p>
      </header>

      <section className={styles.grid}>
        <Link href="/admin/events" className={`${styles.card} glass-panel`}>
          <h2>Events</h2>
          <p>Review drafts, published events, and open event admin workspaces.</p>
          <span className={styles.cardCta}>Go to events →</span>
        </Link>

        <Link href="/admin/create-event" className={`${styles.card} glass-panel`}>
          <h2>Create event</h2>
          <p>Spin up a new experience with schedule, copy, and palette.</p>
          <span className={styles.cardCta}>Create →</span>
        </Link>

        <Link href="/admin/members" className={`${styles.card} glass-panel`}>
          <h2>Members</h2>
          <p>Browse member directory, photo consent, and placeholder profiles.</p>
          <span className={styles.cardCta}>View members →</span>
        </Link>

        <Link href="/admin/security" className={`${styles.card} glass-panel`}>
          <h2>Security</h2>
          <p>Invalidate sessions and manage the coming-soon gate.</p>
          <span className={styles.cardCta}>Open security →</span>
        </Link>

        <Link href="/admin/og-preview" className={`${styles.card} glass-panel`}>
          <h2>OG preview</h2>
          <p>Preview share cards and manage photo gallery OG backgrounds and text.</p>
          <span className={styles.cardCta}>Preview cards →</span>
        </Link>

        <Link href="/admin/rsvp-reminders" className={`${styles.card} glass-panel`}>
          <h2>RSVP reminders</h2>
          <p>See who hasn’t RSVPed for the next event and DM them a reminder.</p>
          <span className={styles.cardCta}>Review list →</span>
        </Link>
      </section>
    </main>
  );
}
