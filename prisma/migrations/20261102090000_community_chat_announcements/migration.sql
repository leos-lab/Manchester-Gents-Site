-- Community chat for every member, location messages, and admin announcements.
-- (New enum values are only used by later statements/transactions.)
ALTER TYPE "ChatRoomKind" ADD VALUE IF NOT EXISTS 'COMMUNITY';
ALTER TYPE "ChatMessageKind" ADD VALUE IF NOT EXISTS 'LOCATION';

ALTER TABLE "ChatMessage"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "placeName" TEXT;

CREATE TABLE "Announcement" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "eventId" TEXT,
  "audience" TEXT NOT NULL,
  "createdById" TEXT,
  "recipients" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
