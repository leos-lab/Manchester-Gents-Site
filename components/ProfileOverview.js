"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import ProfileForm from "./ProfileForm";
import { getDisplayName } from "@/lib/displayName";
import { photoConsentQuestions } from "@/lib/consentContent";

const statusLabel = (value) => (value ? "Yes" : "No");

export default function ProfileOverview({ user }) {
  const [isEditing, setIsEditing] = useState(false);

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const fullName = useMemo(() => {
    const first = user.firstName?.trim() || "";
    const last = user.lastName?.trim() || "";
    return first || last ? `${first} ${last}`.trim() : "Not provided";
  }, [user.firstName, user.lastName]);
  const preferredName = user.preferredName?.trim() || "Not set";
  const hasInstagram = Boolean(
    user.instagramHandle && !user.instagramHandle.startsWith("noinsta_")
  );
  const instagramValue = hasInstagram
    ? `@${user.instagramHandle}`
    : "Not provided";
  const preferredContact = user.preferredContactMethod?.trim() || "Not provided";
  const lastUpdated = useMemo(() => {
    if (!user.consentUpdatedAt) {
      return "Not recorded yet";
    }
    try {
      return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(user.consentUpdatedAt));
    } catch (error) {
      return "Recently updated";
    }
  }, [user.consentUpdatedAt]);

  const termsStatus = user.termsAgreed ? "Agreed" : "Review needed";

  return (
    <div className="overview">
      <section className="hero glass-panel">
        <div className="hero-copy">
          <span className="eyebrow">Manchester Gents member overview</span>
          <h2>{displayName || "Your profile"}</h2>
          <p className="hero-meta">
            Full name: <strong>{fullName}</strong>
            {user.shareFirstName
              ? " · First name shown to fellow members"
              : " · First name kept private"}
          </p>
          <p className="hero-meta">
            Preferred name: <strong>{preferredName}</strong>
          </p>
          <p className="hero-meta">
            Consents last reviewed: <strong>{lastUpdated}</strong>
          </p>
        </div>
        <div className="hero-photo">
          {user.profilePhotoUrl ? (
            <Image
              src={user.profilePhotoUrl}
              alt={
                displayName
                  ? `Reference photo for ${displayName}`
                  : "Member reference photo"
              }
              width={156}
              height={156}
            />
          ) : (
            <div className="photo-placeholder">
              <span>No cropped photo yet</span>
            </div>
          )}
          <p className="photo-caption">
            Your private suited reference stays with the admin team. Share an
            updated shot whenever your look changes.
          </p>
        </div>
      </section>

      <section className="info-grid">
        <article className="info-card glass-panel">
          <span className="card-eyebrow">Contact & handles</span>
          <div className="contact-details">
            <div className="contact-item">
              <span className="contact-label">Email</span>
              <span className="contact-value">{user.email}</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">Instagram</span>
              <span className="contact-value">{instagramValue}</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">Phone</span>
              <span className="contact-value">
                {user.phoneNumber?.trim() || "Not provided"}
              </span>
            </div>
            <div className="contact-item">
              <span className="contact-label">Preferred contact</span>
              <span className="contact-value">{preferredContact}</span>
            </div>
          </div>
        </article>

        <article className="info-card glass-panel">
          <span className="card-eyebrow">Terms & guidelines</span>
          <div className="terms-status">
            <span className="terms-outcome">{termsStatus}</span>
            <p>
              These commitments keep the Lodge relaxed and respectful. Tap edit
              if you need to revisit any of them.
            </p>
          </div>
        </article>

        <article className="info-card glass-panel">
          <span className="card-eyebrow">Photo & tagging preferences</span>
          <ul className="status-list">
            {photoConsentQuestions.map((question) => (
              <li key={question.key}>
                <span>{question.helper}</span>
                <strong>{statusLabel(user[question.key])}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {isEditing ? (
        <section className="editor">
          <div className="editor-head">
            <span className="heading-font">Update profile & consents</span>
            <button
              type="button"
              className="close-button"
              onClick={() => setIsEditing(false)}
            >
              Done
            </button>
          </div>
          <ProfileForm user={user} />
        </section>
      ) : (
        <button
          type="button"
          className="launch-edit"
          onClick={() => setIsEditing(true)}
        >
          Edit profile & consents
        </button>
      )}

      <style jsx>{`
        .overview {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }
        .hero {
          display: flex;
          flex-wrap: wrap;
          gap: 1.75rem;
          padding: 2.25rem;
        }
        .hero-copy {
          flex: 1 1 260px;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .eyebrow {
          font-size: 0.75rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          opacity: 0.7;
        }
        .hero-meta {
          margin: 0;
          font-size: 0.95rem;
          opacity: 0.85;
        }
        .hero-meta strong {
          font-weight: 600;
          letter-spacing: 0.04em;
        }
        .hero-note {
          margin: 0.6rem 0 0;
          font-size: 0.85rem;
          opacity: 0.7;
          max-width: 520px;
        }
        .hero-photo {
          width: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .hero-photo :global(img) {
          width: 156px;
          height: 156px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          object-fit: cover;
        }
        .photo-placeholder {
          width: 156px;
          height: 156px;
          border-radius: 999px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.78rem;
          text-align: center;
          opacity: 0.6;
          padding: 0 1rem;
        }
        .photo-caption {
          margin: 0;
          font-size: 0.75rem;
          opacity: 0.6;
          text-align: center;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }
        .info-card {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          padding: 1.6rem;
          width: 100%;
        }
        .card-eyebrow {
          font-size: 0.74rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          opacity: 0.65;
        }
        .status-list {
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          font-size: 0.92rem;
        }
        .detail-list li,
        .status-list li {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }
        .detail-list span,
        .status-list span {
          opacity: 0.72;
          letter-spacing: 0.04em;
        }
        .detail-list strong,
        .status-list strong {
          font-weight: 600;
          letter-spacing: 0.08em;
        }
        .contact-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
        }
        .contact-item {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 0.75rem;
        }
        .contact-label {
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          opacity: 0.68;
        }
        .contact-value {
          font-size: 0.95rem;
          word-break: break-word;
          overflow-wrap: anywhere;
          letter-spacing: 0.04em;
        }
        .contact-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .terms-status {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .terms-outcome {
          display: inline-flex;
          align-self: flex-start;
          padding: 0.45rem 1.2rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-size: 0.75rem;
          background: rgba(20, 32, 49, 0.65);
          color: var(--color-gold);
        }
        .terms-status p {
          margin: 0;
          font-size: 0.85rem;
          opacity: 0.7;
        }
        .launch-edit {
          align-self: flex-start;
          padding: 0.8rem 1.8rem;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.85rem;
          background: linear-gradient(
            120deg,
            var(--color-gold),
            var(--color-amber)
          );
          color: #0f1727;
          border: none;
          box-shadow: 0 18px 30px rgba(255, 212, 96, 0.25);
        }
        .editor {
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
        }
        .editor-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .editor-head .heading-font {
          flex: 1 1 220px;
        }
        .close-button {
          padding: 0.6rem 1.4rem;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.75rem;
          background: rgba(20, 32, 49, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: var(--color-gold);
        }
        @media (max-width: 720px) {
          .hero {
            padding: 1.5rem;
          }
          .hero-photo {
            width: 100%;
            align-items: flex-start;
          }
          .photo-caption {
            text-align: left;
          }
          .info-card {
            padding: 1.25rem;
          }
          .launch-edit,
          .close-button {
            width: 100%;
            text-align: center;
          }
          .contact-details {
            gap: 0.85rem;
          }
          .editor {
            gap: 1.25rem;
          }
          .editor-head {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
