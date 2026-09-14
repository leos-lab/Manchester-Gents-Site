-- AlterTable
ALTER TABLE "User" ALTER COLUMN "generalPhotoConsent" DROP NOT NULL,
ALTER COLUMN "groupFaceConsent" DROP NOT NULL,
ALTER COLUMN "otherFaceConsent" DROP NOT NULL,
ALTER COLUMN "taggingConsent" DROP NOT NULL;
