-- Beta requests belong to a signed-in member; approving one flags the member.
DELETE FROM "BetaRequest";
ALTER TABLE "BetaRequest" ADD COLUMN "userId" TEXT NOT NULL;
ALTER TABLE "BetaRequest" ADD CONSTRAINT "BetaRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "BetaRequest_userId_idx" ON "BetaRequest"("userId");

ALTER TABLE "User" ADD COLUMN "betaApprovedAt" TIMESTAMP(3);
