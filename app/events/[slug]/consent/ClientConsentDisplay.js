'use client';

import ConsentTable from './ConsentTableClient';
import ConsentList from './ConsentListClient';
import { useAdminMode } from '@/components/AdminModeProvider';
import styles from './page.module.css';

export default function ClientConsentDisplay({ isAdmin, rows }) {
  const { adminMode } = useAdminMode();
  const showPhotos = isAdmin && adminMode;

  return (
    <>
      <div className={`${styles.tableWrap} ${styles.desktopTableWrap}`}>
        <ConsentTable rows={rows} showPhotos={showPhotos} />
      </div>
      <div className={`${styles.tableWrap} ${styles.mobileCards}`}>
        <ConsentList rows={rows} showPhotos={showPhotos} />
      </div>
    </>
  );
}
