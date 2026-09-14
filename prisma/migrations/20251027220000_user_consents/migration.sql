-- Move consent and profile preferences from event signups to users

ALTER TABLE "User"
  ADD COLUMN "fullName" TEXT,
  ADD COLUMN "shareFirstName" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "phoneNumber" TEXT,
  ADD COLUMN "generalPhotoConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "groupFaceConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "otherFaceConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "taggingConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "termsConsentCulture" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "termsSafeSpace" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "termsNoHate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "termsPrivacy" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "termsGuidelines" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "termsAgreed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "termsSignedAt" TIMESTAMP(3),
  ADD COLUMN "consentUpdatedAt" TIMESTAMP(3);

ALTER TABLE "EventSignup"
  DROP COLUMN "fullName",
  DROP COLUMN "shareFirstName",
  DROP COLUMN "contactEmail",
  DROP COLUMN "phoneNumber",
  DROP COLUMN "termsConsentCulture",
  DROP COLUMN "termsSafeSpace",
  DROP COLUMN "termsNoHate",
  DROP COLUMN "termsPrivacy",
  DROP COLUMN "termsGuidelines",
  DROP COLUMN "termsAgreed",
  DROP COLUMN "termsSignedAt",
  DROP COLUMN "generalPhotoConsent",
  DROP COLUMN "groupFaceConsent",
  DROP COLUMN "otherFaceConsent",
  DROP COLUMN "taggingConsent";
