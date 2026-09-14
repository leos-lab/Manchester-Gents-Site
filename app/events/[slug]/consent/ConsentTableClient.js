'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Lightbox from '@/components/Lightbox';
import consentItems from './consentItems';
import styles from './page.module.css';

function getStatusClass(value) {
  if (value === true) {
    return styles.inlineConsentYes;
  }
  if (value === false) {
    return styles.inlineConsentNo;
  }
  return styles.inlineConsentUnset;
}

function getStatusLabel(value) {
  if (value === true) {
    return 'Yes';
  }
  if (value === false) {
    return 'No';
  }
  return 'Not set';
}

export default function ConsentTable({ rows = [], showPhotos = false }) {
  const [activePhoto, setActivePhoto] = useState(null);

  useEffect(() => {
    if (!activePhoto) {
      return undefined;
    }
    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        setActivePhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [activePhoto]);

  const handleAvatarClick = (url) => {
    if (!url) {
      return;
    }
    setActivePhoto(url);
  };

  return (
    <>
      <table className={styles.consentTable}>
        <thead>
          <tr>
            {showPhotos && <th scope="col" className={styles.photoHeader}>Photo</th>}
            <th scope="col">Member</th>
            {consentItems.map(({ key, label, Icon }) => (
              <th key={key} scope="col">
                <span className={styles.tableHeaderIcon} aria-hidden>
                  <Icon />
                </span>
                <span>{label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {showPhotos && (
                <td>
                  {row.photoUrl ? (
                    <button
                      type="button"
                      className={styles.tableAvatar}
                      onClick={() => handleAvatarClick(row.originalPhotoUrl)}
                      aria-label={`View original photo for ${row.displayName}`}
                    >
                      <Image
                        src={row.photoUrl}
                        alt={`Reference photo for ${row.displayName}`}
                        width={44}
                        height={44}
                        className={styles.tableAvatarImage}
                      />
                    </button>
                  ) : (
                    <span className={`${styles.tableAvatar} ${styles.tableAvatarFallback}`}>
                      {row.initials}
                    </span>
                  )}
                </td>
              )}
              <td className={styles.tableIdentity}>
                <span className={styles.cardName}>{row.displayName}</span>
                <span className={styles.cardHandle}>@{row.handle}</span>
              </td>
              {consentItems.map(({ key, label, Icon }) => {
                const statusClass = getStatusClass(row[key]);
                const statusLabel = getStatusLabel(row[key]);
                return (
                  <td key={key}>
                    <span
                      className={`${styles.tableStatus} ${statusClass}`}
                      title={`${label}: ${statusLabel}`}
                    >
                      <Icon aria-hidden className={styles.tableStatusIcon} />
                      <span>{statusLabel}</span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {showPhotos && activePhoto && (
        <Lightbox imageUrl={activePhoto} onClose={() => setActivePhoto(null)} />
      )}
    </>
  );
}
