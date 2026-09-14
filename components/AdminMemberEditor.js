'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AdminMemberEditor.module.css';

export default function AdminMemberEditor({ member }) {
  const router = useRouter();
  const [formState, setFormState] = useState({
    firstName: member.firstName || '',
    lastName: member.lastName || '',
    preferredName: member.preferredName || '',
    shareFirstName: member.shareFirstName ?? true,
    email: member.email || '',
    phoneNumber: member.phoneNumber || '',
    generalPhotoConsent: member.generalPhotoConsent ?? false,
    groupFaceConsent: member.groupFaceConsent ?? false,
    otherFaceConsent: member.otherFaceConsent ?? false,
    taggingConsent: member.taggingConsent ?? false,
    isPlaceholder: member.isPlaceholder ?? false
  });
  const [status, setStatus] = useState({ error: null, success: null });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormState((prev) => ({ ...prev, [field]: value }));
    setStatus({ error: null, success: null });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setStatus({ error: null, success: null });
    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formState.firstName,
          lastName: formState.lastName,
          preferredName: formState.preferredName.trim() || null,
          shareFirstName: formState.shareFirstName,
          email: formState.email,
          phoneNumber: formState.phoneNumber.trim() || null,
          generalPhotoConsent: formState.generalPhotoConsent,
          groupFaceConsent: formState.groupFaceConsent,
          otherFaceConsent: formState.otherFaceConsent,
          taggingConsent: formState.taggingConsent,
          isPlaceholder: formState.isPlaceholder
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Unable to update member.');
      }
      setStatus({ error: null, success: 'Member updated.' });
      router.refresh();
    } catch (err) {
      setStatus({ error: err.message, success: null });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remove this member permanently?')) {
      return;
    }
    setIsDeleting(true);
    setStatus({ error: null, success: null });
    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Unable to remove member.');
      }
      router.push('/admin/members');
      router.refresh();
    } catch (err) {
      setStatus({ error: err.message, success: null });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form className={styles.editor} onSubmit={handleSubmit}>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>First name</span>
          <input value={formState.firstName} onChange={handleChange('firstName')} required />
        </label>
        <label className={styles.field}>
          <span>Last name</span>
          <input value={formState.lastName} onChange={handleChange('lastName')} required />
        </label>
        <label className={styles.field}>
          <span>Preferred name</span>
          <input value={formState.preferredName} onChange={handleChange('preferredName')} />
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={formState.shareFirstName}
            onChange={handleChange('shareFirstName')}
          />
          <span>Shares first name with members</span>
        </label>
        <label className={styles.field}>
          <span>Email</span>
          <input type="email" value={formState.email} onChange={handleChange('email')} required />
        </label>
        <label className={styles.field}>
          <span>Phone</span>
          <input value={formState.phoneNumber} onChange={handleChange('phoneNumber')} />
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={formState.isPlaceholder}
            onChange={handleChange('isPlaceholder')}
          />
          <span>Mark as placeholder</span>
        </label>
      </div>
      <fieldset className={styles.consentGrid}>
        <legend>Photo consents</legend>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={formState.generalPhotoConsent}
            onChange={handleChange('generalPhotoConsent')}
          />
          <span>General photos</span>
        </label>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={formState.groupFaceConsent}
            onChange={handleChange('groupFaceConsent')}
          />
          <span>Group photos</span>
        </label>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={formState.otherFaceConsent}
            onChange={handleChange('otherFaceConsent')}
          />
          <span>Other faces</span>
        </label>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={formState.taggingConsent}
            onChange={handleChange('taggingConsent')}
          />
          <span>Tagging</span>
        </label>
      </fieldset>
      {status.error && <p className={styles.error}>{status.error}</p>}
      {status.success && <p className={styles.success}>{status.success}</p>}
      <div className={styles.actions}>
        <button type="submit" className={styles.saveBtn} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className={styles.deleteBtn} onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? 'Removing…' : 'Remove member'}
        </button>
      </div>
    </form>
  );
}
