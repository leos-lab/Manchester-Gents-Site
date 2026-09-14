'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { termsChecklist, photoConsentQuestions } from '@/lib/consentContent';

const TOTAL_STEPS = 3;

export default function EventSignupButton({
  eventId,
  deadline,
  existingSignup,
  consentSnapshot,
  groupChatLink
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [note, setNote] = useState(existingSignup?.specialRequests || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(existingSignup ? TOTAL_STEPS + 1 : 1);

  const redirectStep = useMemo(() => {
    const rawStep = searchParams?.get('rsvpStep');
    const parsed = rawStep ? Number.parseInt(rawStep, 10) : null;
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Math.min(TOTAL_STEPS, Math.max(1, parsed));
  }, [searchParams]);

  useEffect(() => {
    setNote(existingSignup?.specialRequests || '');
    setShowCancelConfirm(false);
    setError(null);
    if (existingSignup) {
      setStep(TOTAL_STEPS + 1);
      return;
    }
    if (redirectStep) {
      setStep(redirectStep);
      return;
    }
    setStep(1);
  }, [existingSignup, redirectStep]);

  const isLoggedIn = Boolean(session);
  const isLoading = status === 'loading';
  const isRegistered = Boolean(existingSignup);
  const isGroupChatAdded = Boolean(existingSignup?.groupChatAdded);
  const showReservedState = isRegistered || step === TOTAL_STEPS + 1;

  const isClosed = useMemo(() => {
    if (!deadline) {
      return false;
    }
    return new Date(deadline) < new Date();
  }, [deadline]);

  const consentNeedsAttention = useMemo(() => {
    if (!consentSnapshot) {
      return false;
    }
    const missingTerms = termsChecklist.some((term) => consentSnapshot[term.key] !== true);
    const incompletePhoto = photoConsentQuestions.some(
      (question) => typeof consentSnapshot[question.key] !== 'boolean'
    );
    return missingTerms || incompletePhoto;
  }, [consentSnapshot]);

  const consentUpdatedAtText = useMemo(() => {
    if (!consentSnapshot?.consentUpdatedAt) {
      return null;
    }
    try {
      return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(consentSnapshot.consentUpdatedAt));
    } catch (err) {
      return consentSnapshot.consentUpdatedAt;
    }
  }, [consentSnapshot]);

  const chatHostname = useMemo(() => {
    if (!groupChatLink) {
      return null;
    }
    try {
      const url = new URL(groupChatLink);
      return url.hostname.replace(/^www\./, '');
    } catch (err) {
      return groupChatLink;
    }
  }, [groupChatLink]);

  const redirectTarget = useMemo(() => {
    const basePath = pathname || '/';
    const query = new URLSearchParams();
    if (searchParams) {
      searchParams.forEach((value, key) => {
        query.append(key, value);
      });
    }
    query.set('rsvpStep', '2');
    const queryString = query.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }, [pathname, searchParams]);

  const loginUrl = useMemo(
    () => `/login?redirect=${encodeURIComponent(redirectTarget)}`,
    [redirectTarget]
  );

  const handleNext = () => {
    if (!isLoggedIn) {
      router.push(loginUrl);
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleReserve = async () => {
    if (!isLoggedIn) {
      router.push(loginUrl);
      return;
    }
    if (isClosed || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = note.trim().length ? { specialRequests: note.trim() } : {};
      const response = await fetch(`/api/events/${eventId}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Unable to reserve your spot right now.');
      }
      setStep(TOTAL_STEPS + 1);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!isLoggedIn) {
      router.push(loginUrl);
      return;
    }
    if (isCancelling) {
      return;
    }
    setIsCancelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}/signup`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Unable to cancel your RSVP.');
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return null;
  }

  const pendingRequests = existingSignup?.specialRequests || (step === TOTAL_STEPS + 1 ? note.trim() : null);
  const canCancel = isRegistered;
  const showChatLink = Boolean(groupChatLink);
  const primaryCtaLabel = !isLoggedIn && step === 1 ? 'Create Account & RSVP' : 'Continue';

  return (
    <div className="rsvp-container">
      {showReservedState ? (
        <div className="reserved-card">
          <span className="reserved-eyebrow">🎩 You are confirmed for this event.</span>
          {pendingRequests && (
            <p className="reserved-note">Special request: {pendingRequests}</p>
          )}
          <p className="hint hint-success">
            You have been added to the attendee&apos;s group chat, please cheked your instgram DMs or under the
            Request tab.
          </p>
          {showChatLink ? (
            <>
              <p className="hint">
                If you haven&apos;t been added, please use this link below to add yourseld to the group chat. (If
                you are visiting from the instagram browswer, you will need to click the 3 dots on the top right
                to open in an external browswer)
              </p>
              <a
                href={groupChatLink}
                className="chat-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Use this link to add yourself to the group chat{chatHostname ? ` on ${chatHostname}` : ''}
              </a>
            </>
          ) : (
            <p className="hint">We will share the attendee chat link soon.</p>
          )}
          {canCancel ? (
            showCancelConfirm ? (
              <div className="cancel-panel">
                <p>Need to free up your spot?</p>
                <div className="button-row">
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={isCancelling}
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Keep my reservation
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    disabled={isCancelling}
                    onClick={handleCancel}
                  >
                    {isCancelling ? 'Cancelling…' : 'Cancel RSVP'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel my RSVP
              </button>
            )
          ) : (
            <p className="hint">We are confirming your reservation…</p>
          )}
        </div>
      ) : isClosed ? null : (
        <div className="step-card">
          <div className="step-header">
            <span className="step-count">Step {step} of {TOTAL_STEPS}</span>
            <h3 className="step-title">
              {step === 1 && 'Refresh the Manchester Gents code'}
              {step === 2 && 'Share any special requirements'}
              {step === 3 && 'Lock in your spot & meet the attendees'}
            </h3>
          </div>
          <div className="step-content">
            {step === 1 && (
              <>
                <p className="step-copy">
                  Here is a quick refresher of the promises and photo preferences on your profile.
                  Update them anytime from the member profile page.
                </p>
                <div className="consent-columns">
                  <div className="consent-column">
                    <span className="section-eyebrow">Community commitments</span>
                    <ul className="consent-list">
                      {termsChecklist.map((term) => {
                        const accepted = consentSnapshot?.[term.key] === true;
                        return (
                          <li key={term.key} className={accepted ? 'consent-ok' : 'consent-missing'}>
                            <span className="consent-label">
                              {accepted ? '✓' : '•'} {term.title}
                            </span>
                            <p>{term.description}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="consent-column">
                    <span className="section-eyebrow">Photo preferences</span>
                    <ul className="consent-list">
                      {photoConsentQuestions.map((question) => {
                        const value = consentSnapshot?.[question.key];
                        const display =
                          value === true ? 'Yes' : value === false ? 'No' : 'Not set';
                        return (
                          <li key={question.key} className={value === true || value === false ? 'consent-ok' : 'consent-missing'}>
                            <span className="consent-label">{question.helper}</span>
                            <p>{question.label}</p>
                            <span className="photo-value">{display}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                {consentUpdatedAtText && (
                  <p className="step-note">Last updated {consentUpdatedAtText}.</p>
                )}
                {consentNeedsAttention && (
                  <div className="step-warning">
                    <p>It looks like a few items still need your approval. Please review your profile before confirming your RSVP.</p>
                    <button type="button" className="secondary-btn" onClick={() => router.push('/profile')}>
                      Review my consents
                    </button>
                  </div>
                )}
                {!isLoggedIn && (
                  <p className="step-note">Sign in to continue with your RSVP.</p>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <p className="step-copy">
                  Let us know about dietary needs, accessibility considerations, or anything else we should prepare.
                </p>
                <label className="request-field">
                  <span>Special requests (optional)</span>
                  <textarea
                    rows={4}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Drop any needs we should know about before the social."
                  />
                </label>
              </>
            )}
            {step === 3 && (
              <>
                <p className="step-copy">
                  Ready to reserve your place? Once confirmed, we will add you to the attendees’ Instagram group chat. Please check your DMs or the Requests tab. If it doesn’t appear, use the link below — and if you are in the Instagram in-app browser, tap the three dots and open in an external browser.
                </p>
                <div className="chat-preview">
                  <span className="section-eyebrow">Attendee chat</span>
                  {showChatLink ? (
                    <p>
                      We will open the chat{' '}
                      {chatHostname ? `on ${chatHostname}` : 'with the link below'} after you confirm.
                    </p>
                  ) : (
                    <p>The chat invite will be shared once it is ready.</p>
                  )}
                </div>
                {consentNeedsAttention && (
                  <p className="step-warning-text">
                    Update your consents before confirming — the RSVP button will unlock once everything is agreed.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="button-row">
            {step > 1 && (
              <button type="button" className="secondary-btn" onClick={handleBack}>
                Back
              </button>
            )}
            {step < TOTAL_STEPS && (
              <button
                type="button"
                className="primary-btn"
                onClick={handleNext}
                disabled={isClosed}
              >
                {isClosed ? 'Registration closed' : primaryCtaLabel}
              </button>
            )}
            {step === TOTAL_STEPS && (
              <button
                type="button"
                className="primary-btn"
                onClick={handleReserve}
                disabled={isSubmitting || isClosed || consentNeedsAttention}
              >
                {isClosed ? 'Registration closed' : isSubmitting ? 'Reserving…' : 'Confirm RSVP'}
              </button>
            )}
          </div>
        </div>
      )}
      {(!showReservedState && isClosed) && null}
      {error && <p className="error">{error}</p>}
      <style jsx>{`
        .rsvp-container {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .step-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
          border-radius: 18px;
          background: rgba(11, 21, 35, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .step-header {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .step-count {
          font-size: 0.75rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          opacity: 0.65;
        }
        .step-title {
          margin: 0;
          font-size: 1.1rem;
        }
        .step-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .step-copy {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.78;
          line-height: 1.5;
        }
        .step-note {
          margin: 0;
          font-size: 0.8rem;
          opacity: 0.7;
        }
        .step-warning {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          padding: 0.9rem 1rem;
          border-radius: 14px;
          background: rgba(255, 197, 45, 0.12);
          border: 1px solid rgba(255, 197, 45, 0.4);
        }
        .step-warning p {
          margin: 0;
          font-size: 0.85rem;
          color: #ffd460;
        }
        .step-warning-text {
          margin: 0;
          font-size: 0.82rem;
          color: #ffd460;
        }
        .consent-columns {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .consent-column {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .section-eyebrow {
          font-size: 0.75rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          opacity: 0.7;
        }
        .consent-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .consent-list li {
          padding: 0.85rem 1rem;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(12, 20, 33, 0.65);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .consent-ok {
          border-color: rgba(132, 255, 198, 0.35);
          background: rgba(132, 255, 198, 0.08);
        }
        .consent-missing {
          border-color: rgba(255, 148, 148, 0.35);
          background: rgba(255, 148, 148, 0.08);
        }
        .consent-label {
          font-size: 0.78rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .photo-value {
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.72;
        }
        .request-field {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .request-field span {
          font-size: 0.78rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.7;
        }
        textarea {
          border-radius: 12px;
          padding: 0.75rem 1rem;
          background: rgba(11, 21, 35, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: inherit;
          resize: vertical;
          min-height: 120px;
        }
        .chat-preview {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.9rem 1rem;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(12, 20, 33, 0.65);
        }
        .button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
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
        .secondary-btn {
          padding: 0.7rem 1.6rem;
          border-radius: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: rgba(20, 32, 49, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--color-gold);
          cursor: pointer;
        }
        .secondary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .danger-btn {
          padding: 0.7rem 1.6rem;
          border-radius: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: rgba(255, 104, 104, 0.15);
          border: 1px solid rgba(255, 104, 104, 0.35);
          color: #ffb4b4;
        }
        .reserved-card {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          padding: 1.2rem 1.4rem;
          border-radius: 18px;
          background: rgba(52, 211, 153, 0.12);
          border: 1px solid rgba(52, 211, 153, 0.35);
        }
        .reserved-eyebrow {
          font-size: 0.88rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .reserved-note {
          margin: 0;
          font-size: 0.85rem;
          opacity: 0.8;
        }
        .chat-link {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 0.4rem;
          padding: 0.75rem 1.2rem;
          border-radius: 12px;
          background: rgba(15, 23, 39, 0.85);
          border: 1px solid rgba(255, 212, 96, 0.45);
          color: var(--color-gold);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.78rem;
        }
        .cancel-panel {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .cancel-panel p {
          margin: 0;
          font-size: 0.85rem;
          opacity: 0.8;
        }
        .hint {
          margin: 0;
          font-size: 0.8rem;
          opacity: 0.7;
        }
        .hint-success {
          color: #84ffc6;
          opacity: 1;
        }
        .error {
          margin: 0;
          font-size: 0.8rem;
          color: #ff9f9f;
        }
        @media (max-width: 640px) {
          .step-card {
            padding: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}
