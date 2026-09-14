ALTER TABLE "User"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "preferredName" TEXT,
  ADD COLUMN "profilePhotoUrl" TEXT,
  ADD COLUMN "profilePhotoOriginalUrl" TEXT;

-- Maintain backwards compatibility for existing fullName/name fields.
