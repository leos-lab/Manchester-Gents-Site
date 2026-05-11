'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FaDownload, FaSyncAlt, FaTimes, FaUpload } from 'react-icons/fa';
import { useAdminMode } from '@/components/AdminModeProvider';
import styles from './page.module.css';

const PAGE_LIMIT = 100;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function buildApiUrl(apiBase, path) {
  return `${apiBase}${path}`;
}

function getPhotoAsset(photo) {
  return photo.assets?.[0] || null;
}

function normalisePhoto(photo) {
  const asset = getPhotoAsset(photo);
  const thumbUrl = asset?.mediumUrl || asset?.displayUrl || asset?.thumbUrl || asset?.url || '';
  const fullUrl = asset?.url || asset?.displayUrl || asset?.mediumUrl || asset?.thumbUrl || '';
  const previewUrl = fullUrl;
  const coverUrl = asset?.mediumUrl || asset?.displayUrl || asset?.thumbUrl || asset?.url || '';
  const dateSource = photo.takenAt || photo.createdAt;
  const dateTaken = dateSource ? new Date(dateSource) : null;

  return {
    id: String(photo.id || photo.storedFilename || photo.originalFilename || fullUrl),
    originalFilename: photo.originalFilename || 'Manchester Gents photo',
    thumbUrl,
    previewUrl,
    fullUrl,
    coverUrl,
    uploaderName: photo.uploaderName || '',
    dateTaken:
      dateTaken instanceof Date && !Number.isNaN(dateTaken.getTime()) ? dateTaken : null,
    width: photo.width || null,
    height: photo.height || null
  };
}

function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function filenameForPhoto(photo) {
  const fallback = `${photo.id}.jpg`;
  return (photo.originalFilename || fallback).replace(/[^\w.\-]+/g, '-');
}

async function parseApiJson(res) {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error || `Request failed with status ${res.status}`);
  }
  if (!json?.success) {
    throw new Error(json?.error || 'Pinstripe API request failed');
  }
  return json.data;
}

async function downloadPhoto(photo) {
  const url = photo.fullUrl || photo.previewUrl || photo.thumbUrl;
  if (!url) return;

  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('Image request failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filenameForPhoto(photo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function PhotoModal({
  photo,
  onClose,
  onNext,
  onPrev,
  canGoNext,
  canGoPrev,
  showAdminActions,
  busy,
  onSetCover,
  onUnsetCover,
  onDelete
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && canGoNext) onNext();
      if (event.key === 'ArrowLeft' && canGoPrev) onPrev();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canGoNext, canGoPrev, onClose, onNext, onPrev]);

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className={styles.modalContent}>
        <button type="button" className={styles.modalCloseButton} onClick={onClose} aria-label="Close image">
          <FaTimes aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${styles.modalNavButton} ${styles.modalPrevButton}`}
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="Previous image"
        >
          <span aria-hidden="true">&lsaquo;</span>
        </button>
        <img src={photo.previewUrl || photo.fullUrl} alt={photo.originalFilename} className={styles.modalImage} />
        <button
          type="button"
          className={`${styles.modalNavButton} ${styles.modalNextButton}`}
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next image"
        >
          <span aria-hidden="true">&rsaquo;</span>
        </button>

        <div className={styles.modalMeta}>
          <p>{photo.uploaderName || 'Unknown uploader'}</p>
          <span>
            {[formatDate(photo.dateTaken), formatTime(photo.dateTaken)].filter(Boolean).join(' | ')}
          </span>
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.circleButton} onClick={() => downloadPhoto(photo)} aria-label="Download image">
            <FaDownload aria-hidden="true" />
          </button>
          {showAdminActions && (
            <div className={styles.modalAdminActions}>
              <button type="button" onClick={() => onSetCover(photo)} disabled={busy}>
                Set cover
              </button>
              <button type="button" onClick={onUnsetCover} disabled={busy}>
                Unset cover
              </button>
              <button type="button" onClick={() => onDelete(photo)} disabled={busy}>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventPhotosClient({
  apiBase,
  siteSlug,
  eventSlug,
  eventId,
  eventTitle,
  eventDate,
  eventPageHref
}) {
  const { adminMode } = useAdminMode();
  const { data: session, status: sessionStatus } = useSession();
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [uploaderName, setUploaderName] = useState('');
  const [pendingUploaderName, setPendingUploaderName] = useState('');
  const [uploaderError, setUploaderError] = useState('');
  const [showUploaderPrompt, setShowUploaderPrompt] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState('');
  const fileInputRef = useRef(null);
  const uploaderInputRef = useRef(null);

  const encodedSiteSlug = encodeURIComponent(siteSlug);
  const encodedEventSlug = encodeURIComponent(eventSlug);
  const selectedPhotos = useMemo(
    () => photos.filter((photo) => selectedIds.has(photo.id)),
    [photos, selectedIds]
  );
  const selectedIndex = selectedPhoto
    ? photos.findIndex((photo) => photo.id === selectedPhoto.id)
    : -1;
  const canGoPrev = selectedIndex > 0;
  const canGoNext = selectedIndex >= 0 && selectedIndex < photos.length - 1;
  const hasMore = photos.length < total;
  const showAdminActions = adminMode && sessionStatus === 'authenticated' && session?.user?.role === 'ADMIN';

  useEffect(() => {
    const storedName = window.localStorage.getItem('pinstripeUploaderName') || '';
    setUploaderName(storedName);
  }, []);

  useEffect(() => {
    if (!showUploaderPrompt) return;
    setPendingUploaderName(uploaderName);
    setUploaderError('');
    window.setTimeout(() => uploaderInputRef.current?.focus(), 0);
  }, [showUploaderPrompt, uploaderName]);

  const loadPhotos = useCallback(
    async ({ nextPage = 1, append = false } = {}) => {
      if (!apiBase) {
        setLoading(false);
        setError('NEXT_PUBLIC_PINSTRIPE_API_URL is not configured.');
        return;
      }

      setError('');
      if (!append) setLoading(true);

      try {
        const params = new URLSearchParams({
          status: 'uploaded',
          page: String(nextPage),
          limit: String(PAGE_LIMIT),
          createIfMissing: 'true',
          eventTitle
        });
        if (eventDate) {
          params.set('eventDate', eventDate);
        }
        const data = await fetch(
          buildApiUrl(
            apiBase,
            `/api/sites/${encodedSiteSlug}/events/${encodedEventSlug}/photos?${params.toString()}`
          ),
          { cache: 'no-store' }
        ).then(parseApiJson);
        const nextPhotos = (data.photos || [])
          .map(normalisePhoto)
          .filter((photo) => photo.thumbUrl && photo.fullUrl);

        setPhotos((current) => (append ? [...current, ...nextPhotos] : nextPhotos));
        if (!append) {
          const ids = new Set(nextPhotos.map((photo) => photo.id));
          setSelectedIds((currentSelection) =>
            new Set([...currentSelection].filter((id) => ids.has(id)))
          );
        }
        setPage(Number(data.page) || nextPage);
        setTotal(Number(data.total) || nextPhotos.length);
      } catch (err) {
        setError(err.message || 'Could not load gallery.');
      } finally {
        setLoading(false);
      }
    },
    [apiBase, encodedEventSlug, encodedSiteSlug, eventDate, eventTitle]
  );

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    window.addEventListener('focus', loadPhotos);
    return () => window.removeEventListener('focus', loadPhotos);
  }, [loadPhotos]);

  function toggleSelect(photoId) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  }

  function showFeedback(type, message) {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 3500);
  }

  async function getUploadToken() {
    const res = await fetch(buildApiUrl(apiBase, '/api/public/upload-token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteSlug, eventSlug })
    });
    const data = await parseApiJson(res);
    if (!data?.token) {
      throw new Error('Photo uploads are not enabled for this gallery yet.');
    }
    return data.token;
  }

  async function handleFileChange(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (!apiBase) {
      showFeedback('error', 'NEXT_PUBLIC_PINSTRIPE_API_URL is not configured.');
      event.target.value = '';
      return;
    }

    const invalidFile = files.find(
      (file) => !ACCEPTED_MIME_TYPES.has(file.type) || file.size > MAX_FILE_SIZE_BYTES
    );

    if (invalidFile) {
      showFeedback('error', 'Use JPG, PNG, WebP, or GIF files under 20 MB.');
      event.target.value = '';
      return;
    }

    if (!uploaderName.trim()) {
      showFeedback('error', 'Please add your name and Instagram handle first.');
      setShowUploaderPrompt(true);
      event.target.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    setFeedback({ type: 'info', message: 'Preparing upload...' });

    try {
      const token = await getUploadToken();
      setUploadProgress(35);

      const form = new FormData();
      files.forEach((file) => form.append('images[]', file));
      form.append('uploaderName', uploaderName.trim());
      form.append('source', 'website');

      await fetch(
        buildApiUrl(
          apiBase,
          `/api/sites/${encodedSiteSlug}/events/${encodedEventSlug}/photos/bulk-upload`
        ),
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        }
      ).then(parseApiJson);

      setUploadProgress(100);
      showFeedback('success', `${files.length} image${files.length === 1 ? '' : 's'} uploaded.`);
      await loadPhotos();
    } catch (err) {
      showFeedback('error', err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  }

  async function handleDownloadSelected() {
    if (!selectedPhotos.length) return;
    setFeedback({ type: 'info', message: 'Preparing downloads...' });
    for (const photo of selectedPhotos) {
      await downloadPhoto(photo);
    }
    showFeedback('success', `${selectedPhotos.length} download${selectedPhotos.length === 1 ? '' : 's'} started.`);
  }

  async function handleSetCover(photo) {
    const coverImageUrl = photo.coverUrl || photo.thumbUrl || photo.previewUrl || photo.fullUrl;
    if (!coverImageUrl || !eventId) return;

    setBusyPhotoId(photo.id);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/cover`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const authMessage =
          res.status === 401 || res.status === 403
            ? 'Log in as a Manchester admin before setting the cover image.'
            : null;
        throw new Error(authMessage || json?.error || 'Could not set cover image.');
      }
      showFeedback('success', 'Cover image updated.');
    } catch (err) {
      showFeedback('error', err.message || 'Could not set cover image.');
    } finally {
      setBusyPhotoId('');
    }
  }

  async function handleUnsetCover() {
    if (!eventId) return;

    setBusyPhotoId('cover');
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/cover`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl: null })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const authMessage =
          res.status === 401 || res.status === 403
            ? 'Log in as a Manchester admin before changing the cover image.'
            : null;
        throw new Error(authMessage || json?.error || 'Could not unset cover image.');
      }
      showFeedback('success', 'Cover image unset. Photos OG will use the standard background.');
    } catch (err) {
      showFeedback('error', err.message || 'Could not unset cover image.');
    } finally {
      setBusyPhotoId('');
    }
  }

  async function handleDeletePhoto(photo) {
    if (!eventId || !window.confirm('Delete this photo from the gallery?')) return;

    setBusyPhotoId(photo.id);
    try {
      const res = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/photos/${encodeURIComponent(photo.id)}`,
        { method: 'DELETE', credentials: 'same-origin' }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const authMessage =
          res.status === 401 || res.status === 403
            ? 'Log in as a Manchester admin before deleting photos.'
            : null;
        throw new Error(authMessage || json?.error || 'Could not delete photo.');
      }
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(photo.id);
        return next;
      });
      if (selectedPhoto?.id === photo.id) {
        setSelectedPhoto(null);
      }
      setTotal((current) => Math.max(0, current - 1));
      showFeedback('success', 'Photo deleted.');
    } catch (err) {
      showFeedback('error', err.message || 'Could not delete photo.');
    } finally {
      setBusyPhotoId('');
    }
  }

  function openUploaderPrompt() {
    setShowUploaderPrompt(true);
  }

  function confirmUploaderPrompt() {
    const trimmed = pendingUploaderName.trim();
    if (!trimmed) {
      setUploaderError('Please enter your name and Instagram handle.');
      return;
    }
    setUploaderName(trimmed);
    window.localStorage.setItem('pinstripeUploaderName', trimmed);
    setShowUploaderPrompt(false);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function cancelUploaderPrompt() {
    setShowUploaderPrompt(false);
    setUploaderError('');
  }

  function handleNextPhoto() {
    if (canGoNext) setSelectedPhoto(photos[selectedIndex + 1]);
  }

  function handlePrevPhoto() {
    if (canGoPrev) setSelectedPhoto(photos[selectedIndex - 1]);
  }

  return (
    <section className={styles.galleryPage}>
      {uploading && (
        <div className={styles.uploadOverlay} aria-live="polite">
          <div className={styles.uploadProgressBox}>
            <span>Uploading images...</span>
            <div className={styles.uploadBarWrapper}>
              <div className={styles.uploadBar} style={{ width: `${uploadProgress}%` }} />
            </div>
            <div className={styles.uploadPercent}>{uploadProgress}%</div>
          </div>
        </div>
      )}

      <header className={`${styles.galleryHero} glass-panel`}>
        <div className={styles.heroCopy}>
          <span className={styles.sectionEyebrow}>Event photos</span>
          <h1>{eventTitle}</h1>
          <div className={styles.galleryStats} aria-live="polite">
            <span>{loading ? 'Loading' : `${total || photos.length} photos`}</span>
            {selectedIds.size > 0 && <span>{selectedIds.size} selected</span>}
          </div>
        </div>
        <div className={styles.galleryButtons}>
          <Link href={eventPageHref} className={styles.backButton}>
            Back to event
          </Link>
          {showAdminActions && (
            <button
              type="button"
              onClick={handleUnsetCover}
              disabled={busyPhotoId === 'cover'}
              className={styles.standardButton}
            >
              Standard OG
            </button>
          )}
          <button
            type="button"
            onClick={openUploaderPrompt}
            disabled={uploading}
            className={`${styles.iconButton} ${styles.secondaryButton}`}
            aria-label="Upload images"
            title="Upload images"
          >
            <FaUpload aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleDownloadSelected}
            disabled={!selectedIds.size}
            className={`${styles.iconButton} ${styles.primaryButton}`}
            aria-label={`Download selected (${selectedIds.size})`}
            title={`Download selected (${selectedIds.size})`}
          >
            <FaDownload aria-hidden="true" />
            <span className={styles.downloadCount}>{selectedIds.size}</span>
          </button>
          <button
            type="button"
            onClick={() => loadPhotos()}
            className={`${styles.iconButton} ${styles.secondaryButton}`}
            aria-label="Refresh"
            title="Refresh"
          >
            <FaSyncAlt aria-hidden="true" />
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />

      {showUploaderPrompt && (
        <div className={styles.uploaderOverlay} role="dialog" aria-modal="true">
          <div className={styles.uploaderModal}>
            <h2>Who is uploading these photos?</h2>
            <p>This will show next to the upload time. Format: Name @InstagramHandle.</p>
            <input
              ref={uploaderInputRef}
              type="text"
              placeholder="Name @InstagramHandle"
              value={pendingUploaderName}
              onChange={(event) => setPendingUploaderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') confirmUploaderPrompt();
                if (event.key === 'Escape') cancelUploaderPrompt();
              }}
            />
            {uploaderError && <div className={styles.uploaderError}>{uploaderError}</div>}
            <div className={styles.uploaderActions}>
              <button type="button" onClick={cancelUploaderPrompt}>
                Cancel
              </button>
              <button type="button" onClick={confirmUploaderPrompt}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div className={`${styles.feedbackMessage} ${styles[`feedback${feedback.type}`]}`} role="status">
          {feedback.message}
        </div>
      )}

      {error && <div className={`${styles.feedbackMessage} ${styles.feedbackerror}`}>{error}</div>}

      {loading ? (
        <div className={styles.emptyState}>Loading gallery...</div>
      ) : photos.length ? (
        <>
          <section className={styles.masonryGrid} aria-label={`${eventTitle} photos`}>
            {photos.map((photo) => {
              const isSelected = selectedIds.has(photo.id);
              return (
                <article key={photo.id} className={styles.photoCard}>
                  <label className={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      className={styles.photoCheckbox}
                      checked={isSelected}
                      onChange={() => toggleSelect(photo.id)}
                      aria-label={`Select ${photo.originalFilename}`}
                    />
                  </label>
                  <button
                    type="button"
                    className={`${styles.photoImageButton} ${isSelected ? styles.photoSelected : ''}`}
                    onClick={() => (selectedIds.size ? toggleSelect(photo.id) : setSelectedPhoto(photo))}
                    aria-label={`Open ${photo.originalFilename}`}
                  >
                    <img src={photo.thumbUrl} alt="" className={styles.photoImage} loading="lazy" />
                  </button>
                  <div className={styles.photoMeta}>
                    <div className={styles.photoUploader}>{photo.uploaderName || 'Unknown'}</div>
                    <div className={styles.photoDateTime}>
                      <span>{formatDate(photo.dateTaken)}</span>
                      <span>{formatTime(photo.dateTaken)}</span>
                    </div>
                    {showAdminActions && (
                      <div className={styles.adminPhotoActions}>
                        <button
                          type="button"
                          onClick={() => handleSetCover(photo)}
                          disabled={busyPhotoId === photo.id}
                        >
                          Set cover
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={busyPhotoId === photo.id}
                          className={styles.deletePhotoButton}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
          {hasMore && (
            <button
              type="button"
              className={styles.loadMoreButton}
              onClick={() => loadPhotos({ nextPage: page + 1, append: true })}
            >
              Load more
            </button>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>No photos have been uploaded yet.</div>
      )}

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onNext={handleNextPhoto}
          onPrev={handlePrevPhoto}
          canGoNext={canGoNext}
          canGoPrev={canGoPrev}
          showAdminActions={showAdminActions}
          busy={busyPhotoId === selectedPhoto.id}
          onSetCover={handleSetCover}
          onUnsetCover={handleUnsetCover}
          onDelete={handleDeletePhoto}
        />
      )}
    </section>
  );
}
