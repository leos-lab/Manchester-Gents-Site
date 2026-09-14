'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import {
  passwordResetRequestSchema,
  passwordResetSchema,
  registerSchema as registerValidation
} from '@/lib/validators';
import { termsChecklist, photoConsentQuestions } from '@/lib/consentContent';
import ProfilePhotoUploader from './ProfilePhotoUploader';
import RadioPill from './RadioPill';

const loginSchema = z.object({
  identifier: z.string().min(2),
  password: z.string().min(6)
});

function resetAdminMode() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('adminMode', 'false');
  }
}

export function RegisterForm({ redirectTo = '/' }) {
  const router = useRouter();
  const [formState, setFormState] = useState({
    email: '',
    instagramHandle: '',
    hasInstagram: true,
    password: '',
    firstName: '',
    lastName: '',
    preferredName: '',
    shareFirstName: true,
    phoneNumber: '',
    preferredContactMethod: '',
    profilePhotoUrl: '',
    profilePhotoOriginalUrl: '',
    termsConsentCulture: false,
    termsSafeSpace: false,
    termsNoHate: false,
    termsPrivacy: false,
    termsGuidelines: false,
    generalPhotoConsent: null,
    groupFaceConsent: null,
    otherFaceConsent: null,
    taggingConsent: null
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleNoInstagramToggle = (event) => {
    const noInstagram = event.target.checked;
    setFormState((prev) => ({
      ...prev,
      hasInstagram: !noInstagram
    }));
  };

  const handleToggleTerm = (field) => () => {
    setFormState((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSelect = (field, value) => () => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (formState.shareFirstName === false && !formState.preferredName.trim()) {
      setError('Please add a preferred name if you prefer not to share your first name.');
      return;
    }

    if (!formState.hasInstagram && !formState.preferredContactMethod.trim()) {
      setError('Please share how we can reach you.');
      return;
    }

    if (!formState.profilePhotoUrl || !formState.profilePhotoOriginalUrl) {
      setError('Please upload a private reference photo before continuing.');
      return;
    }

    const incompletePhoto = photoConsentQuestions.find((question) => formState[question.key] === null);
    if (incompletePhoto) {
      setError('Please choose your preference for each photo consent question.');
      return;
    }

    const termsAccepted = termsChecklist.every((term) => formState[term.key]);
    if (!termsAccepted) {
      setError('Please agree to every term and condition to continue.');
      return;
    }

    const payload = {
      email: formState.email.trim(),
      instagramHandle: formState.hasInstagram ? formState.instagramHandle.trim() : null,
      hasInstagram: formState.hasInstagram,
      preferredContactMethod: formState.preferredContactMethod.trim(),
      password: formState.password,
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      preferredName: formState.preferredName.trim() || null,
      shareFirstName: formState.shareFirstName,
      phoneNumber: formState.phoneNumber.trim(),
      profilePhotoUrl: formState.profilePhotoUrl,
      profilePhotoOriginalUrl: formState.profilePhotoOriginalUrl,
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

    const parsed = registerValidation.safeParse(payload);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || 'Please double-check the fields and try again.';
      setError(message);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Unable to create account.');
      }
      await signIn('credentials', {
        redirect: false,
        identifier: parsed.data.email,
        password: parsed.data.password
      });
      resetAdminMode();
      router.push(redirectTo || '/');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-section">
        <span className="section-eyebrow">Your details</span>
        <FormField
          label="First name"
          type="text"
          value={formState.firstName}
          onChange={handleChange('firstName')}
          required
        />
        <FormField
          label="Last name"
          type="text"
          value={formState.lastName}
          onChange={handleChange('lastName')}
          required
        />
        <div className="field-block">
          <span className="field-label">
            Do you consent to us sharing your first name with other members?
          </span>
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
        {!formState.shareFirstName && (
          <FormField
            label="Preferred name"
            type="text"
            value={formState.preferredName}
            onChange={handleChange('preferredName')}
            placeholder="How should we address you?"
            required
          />
        )}
        {formState.shareFirstName && (
          <FormField
            label="Preferred name (optional)"
            type="text"
            value={formState.preferredName}
            onChange={handleChange('preferredName')}
            placeholder="How should we address you?"
          />
        )}
        {formState.hasInstagram && (
          <FormField
            label="Instagram username"
            type="text"
            value={formState.instagramHandle}
            onChange={handleChange('instagramHandle')}
            required
            prefix="@"
          />
        )}
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={!formState.hasInstagram}
            onChange={handleNoInstagramToggle}
          />
          <span>I don&rsquo;t have Instagram</span>
        </label>
        {!formState.hasInstagram && (
          <FormField
            label="Preferred contact method"
            type="text"
            value={formState.preferredContactMethod}
            onChange={handleChange('preferredContactMethod')}
            placeholder="Share a phone, email, or other channel"
            required
          />
        )}
        <FormField
          label="Phone number (optional)"
          type="tel"
          value={formState.phoneNumber}
          onChange={handleChange('phoneNumber')}
          placeholder="Include your country code if outside the UK"
        />
        <FormField
          label="Email"
          type="email"
          value={formState.email}
          onChange={handleChange('email')}
          required
        />
        <FormField
          label="Password"
          type="password"
          value={formState.password}
          onChange={handleChange('password')}
          required
        />
        <ProfilePhotoUploader
          required
          value={{
            originalUrl: formState.profilePhotoOriginalUrl,
            croppedUrl: formState.profilePhotoUrl
          }}
          onChange={({ originalUrl, croppedUrl }) =>
            setFormState((prev) => ({
              ...prev,
              profilePhotoOriginalUrl: originalUrl,
              profilePhotoUrl: croppedUrl
            }))
          }
        />
      </div>
      <div className="form-section">
        <span className="section-eyebrow">Terms &amp; conditions</span>
        <p className="section-copy">
          Manchester Gents is a curated community. Please review each commitment and tap to confirm
          you agree.
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
        <span className="section-eyebrow">Photo consent</span>
        <p className="section-copy">
          Let us know how you would like to appear in stories, recaps, and future features. You can
          update these at any time from your profile.
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
      <p className="consent-note">
        You can review or update your consents at any time on your member profile.
      </p>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" disabled={isSubmitting} className="auth-submit">
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
      <style jsx>{`
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
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
          opacity: 0.75;
        }
        .radio-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
        }
        .checkbox-field {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.78rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .checkbox-field input {
          width: 18px;
          height: 18px;
          accent-color: var(--color-gold);
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
        .consent-note {
          margin: 0;
          font-size: 0.8rem;
          opacity: 0.7;
        }
        .auth-submit {
          padding: 0.85rem 1.5rem;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(120deg, var(--color-gold), var(--color-amber));
          color: #0f1727;
          box-shadow: 0 20px 32px rgba(255, 212, 96, 0.25);
        }
        .auth-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .auth-error {
          margin: 0;
          color: #ff9f9f;
          font-size: 0.8rem;
        }
        @media (max-width: 720px) {
          .form-section {
            padding: 1rem;
          }
          .radio-group {
            gap: 0.5rem;
          }
          .checkbox-field {
            font-size: 0.72rem;
          }
          .auth-submit {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </form>
  );
}

export function LoginForm({ redirectTo = '/' }) {
  const router = useRouter();
  const [formState, setFormState] = useState({ identifier: '', password: '' });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse(formState);
    if (!parsed.success) {
      setError('Please enter your Instagram username or email and password.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        identifier: parsed.data.identifier,
        password: parsed.data.password
      });
      if (result?.error) {
        throw new Error(result.error);
      }
      resetAdminMode();
      router.push(redirectTo || '/');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <FormField
        label="Email or Instagram username"
        type="text"
        value={formState.identifier}
        onChange={handleChange('identifier')}
        required
      />
      <FormField
        label="Password"
        type="password"
        value={formState.password}
        onChange={handleChange('password')}
        required
      />
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" disabled={isSubmitting} className="auth-submit">
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
      <style jsx>{`
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .auth-submit {
          padding: 0.85rem 1.5rem;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(120deg, var(--color-gold), var(--color-amber));
          color: #0f1727;
          box-shadow: 0 20px 32px rgba(255, 212, 96, 0.25);
        }
        .auth-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .auth-error {
          margin: 0;
          color: #ff9f9f;
          font-size: 0.8rem;
        }
        @media (max-width: 720px) {
          .auth-submit {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const parsed = passwordResetRequestSchema.safeParse({ identifier });
    if (!parsed.success) {
      setError(parsed.error.errors?.[0]?.message || 'Please enter your email or Instagram username.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Unable to send reset link right now.');
      }
      setSuccess("If your account exists, we'll email you a reset link shortly.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <FormField
        label="Email or Instagram username"
        type="text"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        required
        autoComplete="username"
      />
      {error && <p className="auth-error">{error}</p>}
      {success && <p className="auth-success">{success}</p>}
      <button type="submit" disabled={isSubmitting} className="auth-submit">
        {isSubmitting ? 'Sending link…' : 'Send reset link'}
      </button>
      <style jsx>{`
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .auth-submit {
          padding: 0.85rem 1.5rem;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(120deg, var(--color-gold), var(--color-amber));
          color: #0f1727;
          box-shadow: 0 20px 32px rgba(255, 212, 96, 0.25);
        }
        .auth-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .auth-error {
          margin: 0;
          color: #ff9f9f;
          font-size: 0.8rem;
        }
        .auth-success {
          margin: 0;
          color: #9be5b2;
          font-size: 0.85rem;
        }
        @media (max-width: 720px) {
          .auth-submit {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </form>
  );
}

export function ResetPasswordForm({ token = '' }) {
  const router = useRouter();
  const [formState, setFormState] = useState({ token, password: '', confirmPassword: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(Boolean(token));
  const [tokenValid, setTokenValid] = useState(token ? null : false);
  const [showTokenField, setShowTokenField] = useState(!token);

  useEffect(() => {
    let cancelled = false;
    if (!formState.token) {
      setTokenValid(false);
      setIsCheckingToken(false);
      return () => {};
    }

    setIsCheckingToken(true);
    setTokenValid(null);

    const checkToken = async () => {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(formState.token)}`);
        const data = await res.json().catch(() => ({ valid: false }));
        if (!cancelled) {
          setTokenValid(Boolean(data.valid));
        }
      } catch (err) {
        if (!cancelled) {
          setTokenValid(false);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingToken(false);
        }
      }
    };
    checkToken();

    return () => {
      cancelled = true;
    };
  }, [formState.token]);

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = passwordResetSchema.safeParse({
      token: formState.token,
      password: formState.password
    });
    if (!parsed.success) {
      setError(parsed.error.errors?.[0]?.message || 'Please double-check your details.');
      return;
    }
    if (formState.password !== formState.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (tokenValid === false) {
      setError('This reset link is invalid or has expired.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to reset password right now.');
      }
      setSuccess('Password updated. You can now sign in.');
      setFormState((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      router.prefetch('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {!showTokenField && (
        <>
          <input type="hidden" value={formState.token} readOnly />
          <p className="auth-hint">Reset link applied from your email.</p>
          <button type="button" className="token-toggle" onClick={() => setShowTokenField(true)}>
            Use a different link
          </button>
        </>
      )}
      {showTokenField && (
        <FormField
          label="Reset token"
          type="text"
          value={formState.token}
          onChange={handleChange('token')}
          required
          autoComplete="one-time-code"
        />
      )}
      <FormField
        label="New password"
        type="password"
        value={formState.password}
        onChange={handleChange('password')}
        required
        autoComplete="new-password"
      />
      <FormField
        label="Confirm new password"
        type="password"
        value={formState.confirmPassword}
        onChange={handleChange('confirmPassword')}
        required
        autoComplete="new-password"
      />
      {isCheckingToken && <p className="auth-hint">Checking your reset link…</p>}
      {error && <p className="auth-error">{error}</p>}
      {tokenValid === false && formState.token && !error && (
        <p className="auth-error">This reset link is invalid or has expired.</p>
      )}
      {success && <p className="auth-success">{success}</p>}
      <button type="submit" disabled={isSubmitting} className="auth-submit">
        {isSubmitting ? 'Updating…' : 'Update password'}
      </button>
      <style jsx>{`
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .auth-submit {
          padding: 0.85rem 1.5rem;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(120deg, var(--color-gold), var(--color-amber));
          color: #0f1727;
          box-shadow: 0 20px 32px rgba(255, 212, 96, 0.25);
        }
        .auth-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .auth-error {
          margin: 0;
          color: #ff9f9f;
          font-size: 0.8rem;
        }
        .auth-success {
          margin: 0;
          color: #9be5b2;
          font-size: 0.85rem;
        }
        .auth-hint {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
        }
        .token-toggle {
          align-self: flex-start;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: transparent;
          color: inherit;
          font-size: 0.8rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .token-toggle:hover {
          border-color: var(--color-gold);
        }
        @media (max-width: 720px) {
          .auth-submit {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </form>
  );
}

function FormField({ label, prefix, ...inputProps }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <div className="form-input-wrapper">
        {prefix && <span className="form-prefix">{prefix}</span>}
        <input {...inputProps} />
      </div>
      <style jsx>{`
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .form-input-wrapper {
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
        .form-prefix {
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
