-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SignupStatus" AS ENUM ('CONFIRMED', 'WAITLISTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "instagramHandle" TEXT NOT NULL,
    "name" TEXT,
    "bio" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "backgroundColor" TEXT,
    "textColor" TEXT,
    "coverImageUrl" TEXT,
    "signupDeadline" TIMESTAMP(3),
    "capacity" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSignup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "SignupStatus" NOT NULL DEFAULT 'CONFIRMED',
    "note" TEXT,
    "fullName" TEXT NOT NULL,
    "shareFirstName" BOOLEAN NOT NULL DEFAULT false,
    "contactEmail" TEXT,
    "phoneNumber" TEXT,
    "termsConsentCulture" BOOLEAN NOT NULL DEFAULT false,
    "termsSafeSpace" BOOLEAN NOT NULL DEFAULT false,
    "termsNoHate" BOOLEAN NOT NULL DEFAULT false,
    "termsPrivacy" BOOLEAN NOT NULL DEFAULT false,
    "termsGuidelines" BOOLEAN NOT NULL DEFAULT false,
    "termsAgreed" BOOLEAN NOT NULL DEFAULT false,
    "termsSignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generalPhotoConsent" BOOLEAN NOT NULL DEFAULT false,
    "groupFaceConsent" BOOLEAN NOT NULL DEFAULT false,
    "otherFaceConsent" BOOLEAN NOT NULL DEFAULT false,
    "taggingConsent" BOOLEAN NOT NULL DEFAULT false,
    "specialRequests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_instagramHandle_key" ON "User"("instagramHandle");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- AddForeignKey
ALTER TABLE "EventSignup" ADD CONSTRAINT "EventSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSignup" ADD CONSTRAINT "EventSignup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
