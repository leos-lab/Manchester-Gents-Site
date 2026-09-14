'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import RadioPill from './RadioPill';
import { termsChecklist, photoConsentQuestions } from '@/lib/consentContent';
import { profileUpdateSchema } from '@/lib/validators';
import ProfilePhotoUploader from './ProfilePhotoUploader';

export default function ProfileForm({ user }) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [formState, setFormState] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    preferredName: user.preferredName || '',
    shareFirstName: typeof user.shareFirstName === 'boolean' ? user.shareFirstName : true,
    phoneNumber: user.phoneNumber || '',
    preferredContactMethod: user.preferredContactMethod || '',
    profilePhotoUrl: user.profilePhotoUrl || '',
    profilePhotoOriginalUrl: user.profilePhotoOriginalUrl || '',
    termsConsentCulture: user.termsConsentCulture,
    termsSafeSpace: user.termsSafeSpace,
    termsNoHate: user.termsNoHate,
    termsPrivacy: user.termsPrivacy,
    termsGuidelines: user.termsGuidelines,
    generalPhotoConsent: user.generalPhotoConsent,
    groupFaceConsent: user.groupFaceConsent,
    otherFaceConsent: user.otherFaceConsent,
    taggingConsent: user.taggingConsent
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const lastUpdatedText = useMemo(() => {
    if (!user.consentUpdatedAt) {
      return 'Not recorded yet';
    }
    try {
      return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(user.consentUpdatedAt));
    } catch (err) {
      return 'Recently updated';
    }
  }, [user.consentUpdatedAt]);

  const handleChange = (field) => (event) => {
    setSuccess(false);
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleToggleTerm = (field) => () => {
    setSuccess(false);
    setFormState((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSelect = (field, value) => () => {
    setSuccess(false);
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (formState.shareFirstName === false && !formState.preferredName.trim()) {
      setError('Please provide a preferred name if you do not want your first name displayed.');
      return;
    }

    const incompletePhoto = photoConsentQuestions.find((question) => typeof formState[question.key] !== 'boolean');
    if (incompletePhoto) {
      setError('Please choose an answer for each photo consent item.');
      return;
    }

    const termsAccepted = termsChecklist.every((term) => formState[term.key]);
    if (!termsAccepted) {
      setError('All Manchester Gents terms must be accepted to save your profile.');
      return;
    }

    const payload = {
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      preferredName: formState.preferredName.trim() || null,
      shareFirstName: formState.shareFirstName,
      phoneNumber: formState.phoneNumber.trim(),
      preferredContactMethod: formState.preferredContactMethod.trim(),
      profilePhotoUrl: formState.profilePhotoUrl || null,
      profilePhotoOriginalUrl: formState.profilePhotoOriginalUrl || null,
      termsConsentCulture: formState.termsConsentCulture,
      termsSafeSpace: formState.termsSafeSpace,
      termsNoHate: formState.termsNoHate,
      termsPrivacy: formState.termsPrivacy,
      termsGuidelines: formState.termsGuidelines,
      generalPhotoConsent: formState.generalPhotoConsent,
      groupFaceConsent: formState.groupFaceConsent,
      otherFaceConsent: formState.otherFaceConsent,
      taggingConsent: formState.taggingConsent
    };

    const parsed = profileUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || 'Please review your details and try again.';
      setError(message);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Unable to update your profile.');
      }
      setSuccess(true);
      await updateSession();
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="profile-form glass-panel" onSubmit={handleSubmit}>
      <div className="form-head">
        <span className="heading-font">Consent preferences</span>
        <p className="timestamp">Last updated {lastUpdatedText}</p>
      </div>
      <div className="form-section">
        <span className="section-eyebrow">Personal details</span>
        <InputField
          label="First name"
          value={formState.firstName}
          onChange={handleChange('firstName')}
          required
        />
        <InputField
          label="Last name"
          value={formState.lastName}
          onChange={handleChange('lastName')}
          required
        />
        <div className="field-block">
          <span className="field-label">Share my first name with members</span>
          <div className="radio-group">
            <RadioPill
              label="Yes"
              active={formState.shareFirstName === true}
              onClick={handleSelect('shareFirstName', true)}
            />
            <RadioPill
              label="No"
              active={formState.shareFirstName === false}
              onClick={handleSelect('shareFirstName', false)}
            />
          </div>
        </div>
        {formState.shareFirstName === false && (
          <InputField
            label="Preferred name"
            value={formState.preferredName}
            onChange={handleChange('preferredName')}
            placeholder="How should we address you?"
            required
          />
        )}
        <InputField
          label="Phone number (optional)"
          type="tel"
          value={formState.phoneNumber}
          onChange={handleChange('phoneNumber')}
          placeholder="Update this if your contact number changes"
        />
        <InputField
          label="Preferred contact method (optional)"
          value={formState.preferredContactMethod}
          onChange={handleChange('preferredContactMethod')}
          placeholder="Share a phone, email, or other channel"
        />
        <ProfilePhotoUploader
          value={{
            originalUrl: formState.profilePhotoOriginalUrl,
            croppedUrl: formState.profilePhotoUrl
          }}
          onChange={({ originalUrl, croppedUrl }) => {
            setSuccess(false);
            setFormState((prev) => ({
              ...prev,
              profilePhotoOriginalUrl: originalUrl,
              profilePhotoUrl: croppedUrl
            }));
          }}
        />
      </div>
      <div className="form-section">
        <span className="section-eyebrow">Terms &amp; guidelines</span>
        <p className="section-copy">
          We expect every Manchester Gents member to uphold these values. Tap each card to reaffirm
          your commitment.
        </p>
        <div className="terms-grid">
          {termsChecklist.map((term) => {
            const isActive = formState[term.key];
            return (
              <button
                key={term.key}
                type="button"
                className={`term-card ${isActive ? 'term-card-active' : ''}`}
                onClick={handleToggleTerm(term.key)}
              >
                <span className="term-title">{term.title}</span>
                <p>{term.description}</p>
                <span className="term-indicator">{isActive ? 'Agreed' : 'Tap to agree'}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="form-section">
        <span className="section-eyebrow">Photo preferences</span>
        <p className="section-copy">
          Adjust how we feature you in event coverage and social storytelling.
        </p>
        <div className="photo-grid">
          {photoConsentQuestions.map((question) => (
            <div key={question.key} className="photo-card">
              <span className="photo-helper">{question.helper}</span>
              <p>{question.label}</p>
              <div className="radio-group">
                <RadioPill
                  label="Yes"
                  active={formState[question.key] === true}
                  onClick={handleSelect(question.key, true)}
                />
                <RadioPill
                  label="No"
                  active={formState[question.key] === false}
                  onClick={handleSelect(question.key, false)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {error && <p className="status status-error">{error}</p>}
      {success && <p className="status status-success">Profile updated successfully.</p>}
      <div className="form-footer">
        <button type="submit" className="primary-btn" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
      <style jsx>{`
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 2rem;
          border-radius: 20px;
          width: 100%;
        }
        .form-head {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .timestamp {
          margin: 0;
          font-size: 0.8rem;
          opacity: 0.65;
        }
        .form-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.25rem;
          border-radius: 16px;
          background: rgba(14, 24, 38, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .section-eyebrow {
          font-size: 0.75rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          opacity: 0.72;
        }
        .section-copy {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.75;
        }
        .field-block {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .field-label {
          font-size: 0.78rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.72;
        }
        .radio-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
        }
        .terms-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .term-card {
          text-align: left;
          border-radius: 16px;
          padding: 1rem 1.2rem;
          background: rgba(15, 26, 40, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          color: inherit;
          cursor: pointer;
        }
        .term-card-active {
          border-color: rgba(255, 212, 96, 0.55);
          background: rgba(255, 212, 96, 0.12);
        }
        .term-title {
          font-size: 0.78rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .term-indicator {
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.65;
        }
        .photo-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .photo-card {
          border-radius: 16px;
          padding: 1rem 1.2rem;
          background: rgba(15, 26, 40, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .photo-helper {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.75rem;
          opacity: 0.7;
        }
        .status {
          margin: 0;
          font-size: 0.82rem;
        }
        .status-error {
          color: #ff9f9f;
        }
        .status-success {
          color: #9affc7;
        }
        .form-footer {
          display: flex;
          justify-content: flex-end;
        }
        .primary-btn {
          padding: 0.85rem 1.8rem;
          border-radius: 999px;
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #0f1727;
          background: linear-gradient(120deg, var(--color-gold), var(--color-amber));
          box-shadow: 0 20px 30px rgba(255, 212, 96, 0.25);
          border: none;
        }
        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 720px) {
          .profile-form {
            padding: 1.4rem;
            gap: 1.25rem;
          }
          .form-section {
            padding: 1rem;
            gap: 0.85rem;
          }
          .form-head {
            gap: 0.25rem;
          }
          .radio-group {
            gap: 0.5rem;
          }
          .term-card,
          .photo-card {
            padding: 0.9rem 1rem;
          }
          .form-footer {
            justify-content: center;
          }
          .primary-btn {
            width: 100%;
          }
        }
      `}</style>
    </form>
  );
}

function InputField({ label, prefix, ...inputProps }) {
  return (
    <label className="input-field">
      <span>{label}</span>
      <div className="input-wrapper">
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input {...inputProps} />
      </div>
      <style jsx>{`
        .input-field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .input-wrapper {
          position: relative;
        }
        input {
          width: 100%;
          border-radius: 12px;
          padding: 0.85rem 1rem 0.85rem ${prefix ? '2.2rem' : '1rem'};
          background: rgba(14, 24, 38, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: inherit;
          font-size: 0.95rem;
          letter-spacing: 0;
          text-transform: none;
        }
        input:focus {
          outline: none;
          border-color: var(--color-gold);
        }
        .input-prefix {
          position: absolute;
          top: 50%;
          left: 0.9rem;
          transform: translateY(-50%);
          opacity: 0.5;
        }
      `}</style>
    </label>
  );
}
