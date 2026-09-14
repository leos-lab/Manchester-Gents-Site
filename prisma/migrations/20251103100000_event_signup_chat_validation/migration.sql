-- Add chat validation code to event signups for DM verification.
ALTER TABLE "EventSignup" ADD COLUMN "chatValidationCode" TEXT;

-- Ensure each validation code is unique.
CREATE UNIQUE INDEX "EventSignup_chatValidationCode_key" ON "EventSignup"("chatValidationCode");
