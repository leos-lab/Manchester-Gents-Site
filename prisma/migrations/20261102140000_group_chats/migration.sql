-- Members' own group chats, optionally regarding an event.
ALTER TYPE "ChatRoomKind" ADD VALUE IF NOT EXISTS 'GROUP';

ALTER TABLE "ChatRoom"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "regardingEventId" TEXT,
  ADD COLUMN "createdById" TEXT;

ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_regardingEventId_fkey"
  FOREIGN KEY ("regardingEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
