import Link from 'next/link';
import InvalidateSessionsButton from '@/components/InvalidateSessionsButton';
import ComingSoonGateCard from '@/components/ComingSoonGateCard';
import { getComingSoonConfig } from '@/lib/comingSoonConfig';
import styles from './page.module.css';

export const metadata = {
  title: 'Security | Manchester Gents Admin'
};

export default async function AdminSecurityPage() {
  const comingSoonConfig = await getComingSoonConfig();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.backLink}>
          ← Back to admin
        </Link>
        <h1>Security & gatekeeping</h1>
        <p>Control sessions and toggle the coming-soon gate.</p>
      </header>

      <section className={styles.section}>
        <div className={`${styles.securityCard} glass-panel`}>
          <div className={styles.securityCopy}>
            <span className={styles.securityEyebrow}>Sessions</span>
            <h2>Sign everyone out</h2>
            <p>
              Force every member and admin to log back in. Use if a device is lost or credentials
              are at risk.
            </p>
          </div>
          <InvalidateSessionsButton
            buttonClassName={styles.dangerButton}
            statusClassName={styles.statusText}
            successClassName={styles.statusSuccess}
            errorClassName={styles.statusError}
          />
        </div>

        <ComingSoonGateCard
          initialConfig={{
            enabled: comingSoonConfig?.enabled ?? true,
            disableAt: comingSoonConfig?.disableAt ? comingSoonConfig.disableAt.toISOString() : null
          }}
        />
      </section>
    </main>
  );
}

