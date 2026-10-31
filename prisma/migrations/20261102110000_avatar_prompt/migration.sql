-- When the member finished the app's one-off "choose an avatar" prompt.
ALTER TABLE "User" ADD COLUMN "avatarPromptDoneAt" TIMESTAMP(3);
