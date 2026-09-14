'use client';

import Link from 'next/link';
import { useAdminMode } from '@/components/AdminModeProvider';
import styles from './page.module.css';

export default function ClientAdminControls({ isAdmin, slug }) {
  const { adminMode } = useAdminMode();

  if (!isAdmin || !adminMode) {
    return null;
  }

  return (
    <div className={styles.adminControlBlock}>
      <Link href={`/events/${slug}/admin`} className={styles.adminManageLink}>
        Manage event →
      </Link>
    </div>
  );
}
