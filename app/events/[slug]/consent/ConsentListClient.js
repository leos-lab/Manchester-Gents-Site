'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Lightbox from '@/components/Lightbox';
import styles from './page.module.css';
import consentItems from './consentItems';

function getStatusLabel(value) {
  if (value === true) {
    return 'Yes';
  }
  if (value === false) {
    return 'No';
  }
  return 'Not set';
}

export default function ConsentList({ rows = [], showPhotos = false }) {
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
      <div className={styles.consentList}>
        {rows.map((row) => (
          <article key={row.id} className={styles.consentCard}>
            <header className={styles.cardHeader}>
              {showPhotos && (
                row.photoUrl ? (
                  <button
                    type="button"
                    className={styles.cardAvatar}
                    onClick={() => handleAvatarClick(row.originalPhotoUrl)}
                    aria-label={`View original photo for ${row.displayName}`}
                  >
                    <Image
                      src={row.photoUrl}
                      alt={`Reference photo for ${row.displayName}`}
                      width={48}
                      height={48}
                      className={styles.cardAvatarImage}
                    />
                  </button>
                ) : (
                  <span className={`${styles.cardAvatar} ${styles.cardAvatarFallback}`}>
                    {row.initials}
                  </span>
                )
              )}
              <div className={styles.cardIdentity}>
                <span className={styles.cardName}>{row.displayName}</span>
                <span className={styles.cardHandle}>@{row.handle}</span>
              </div>
            </header>
            <div className={styles.cardConsentsInline}>
              {consentItems.map(({ key, label, Icon }) => {
                const containerClass =
                  row[key] === true
                    ? styles.inlineConsentYes
                    : row[key] === false
                    ? styles.inlineConsentNo
                    : styles.inlineConsentUnset;
                const statusLabel = getStatusLabel(row[key]);
                return (
                  <span
                    key={key}
                    className={`${styles.inlineConsent} ${containerClass}`}
                    title={`${label}: ${statusLabel}`}
                  >
                    <span className={styles.inlineIcon} aria-hidden>
                      <Icon />
                    </span>
                    <span className={styles.srOnly}>{`${label}: ${statusLabel}`}</span>
                  </span>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      {showPhotos && activePhoto && (
        <Lightbox imageUrl={activePhoto} onClose={() => setActivePhoto(null)} />
      )}
    </>
  );
}
