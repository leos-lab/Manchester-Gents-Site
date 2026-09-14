import AdminEventForm from '@/components/AdminEventForm';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: 'Create Event | Manchester Gents'
};

export default async function AdminCreateEventPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.backLink}>
          ← Back to admin
        </Link>
        <h1>Create a new experience</h1>
        <p>Set the schedule, copy, and palette for a fresh Manchester Gents gathering.</p>
      </header>
      <section className={styles.formSection}>
        <AdminEventForm />
      </section>
    </main>
  );
}
