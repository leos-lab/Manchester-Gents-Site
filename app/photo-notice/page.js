'use client';

import { Suspense, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import PhotographyNotice from '@/components/PhotographyNotice';
import styles from './page.module.css';

export default function PhotoNoticePage() {
  return (
    <Suspense fallback={null}>
      <PhotoNoticeContent />
    </Suspense>
  );
}

function PhotoNoticeContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const nextPath = searchParams?.get('next') || '/';

  const handleAcknowledge = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/photo-notice/acknowledge', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to save your acknowledgment right now.');
      }
      await update({ photoNoticeAgreedAt: data.photoNoticeAgreedAt });
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Unable to save your acknowledgment right now.');
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={`${styles.card} glass-panel`}>
        <span className={styles.eyebrow}>Updated terms</span>
        <h1>We&apos;ve updated our photography notice</h1>
        <p className={styles.intro}>
          Please read the update below. You&apos;ll need to acknowledge it before continuing.
        </p>
        <PhotographyNotice />
        {status === 'authenticated' && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.acknowledgeButton}
              onClick={handleAcknowledge}
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'I understand, continue'}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </div>
        )}
        {!session?.user && status !== 'loading' && (
          <p className={styles.intro}>Please sign in to continue.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
