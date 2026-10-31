-- Group chat admins, and pictures for group and community chats.
ALTER TABLE "ChatRoom" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "ChatRoomMember" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
-- Existing groups: their creator is an admin.
UPDATE "ChatRoomMember" m SET "isAdmin" = true
  FROM "ChatRoom" r WHERE r."id" = m."roomId" AND r."kind" = 'GROUP' AND r."createdById" = m."userId";
