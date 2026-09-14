'use client';

import { useAdminMode } from '@/components/AdminModeProvider';
import styles from './ToggleAdminModeButton.module.css';

export default function ToggleAdminModeButton() {
  const { adminMode, toggleAdminMode } = useAdminMode();

  return (
    <button type="button" className={styles.toggle} onClick={toggleAdminMode}>
      Admin mode: <span>{adminMode ? 'On' : 'Off'}</span>
    </button>
  );
}
