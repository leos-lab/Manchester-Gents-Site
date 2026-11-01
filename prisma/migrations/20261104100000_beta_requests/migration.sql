-- Requests to join the app beta, approved by an admin in the app.
CREATE TYPE "BetaPlatform" AS ENUM ('IOS', 'ANDROID');
CREATE TYPE "BetaRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

CREATE TABLE "BetaRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "instagramHandle" TEXT NOT NULL,
    "platform" "BetaPlatform" NOT NULL,
    "message" TEXT,
    "status" "BetaRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "BetaRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BetaRequest_status_createdAt_idx" ON "BetaRequest"("status", "createdAt");
