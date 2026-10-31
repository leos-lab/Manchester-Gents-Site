// All database access for the chat server. Uses the same Postgres database
// (and Prisma-created tables) as the Manchester Gents site.
import { randomBytes } from 'node:crypto';

export const PAGE_SIZE = 50;

export function newId() {
  // Prisma ids are plain strings; a cuid-like id keeps them sortable-ish and short.
  return 'c' + Date.now().toString(36) + randomBytes(8).toString('hex');
}

const SENDER_COLUMNS = `
  u."id" AS "senderId", u."firstName", u."lastName", u."preferredName",
  u."shareFirstName", u."name", u."instagramHandle", u."profilePhotoUrl", u."role" AS "senderRole"`;

export function displayName(u) {
  if (!u) return '';
  const preferred = u.preferredName?.trim();
  const first = u.firstName?.trim();
  const last = u.lastName?.trim();
  if (u.shareFirstName === false) return preferred || first || u.instagramHandle || '';
  if (preferred) return preferred;
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  return u.name?.trim() || u.instagramHandle || '';
}

export function shapeMessage(row) {
  const deleted = Boolean(row.deletedAt);
  return {
    id: row.id,
    eventId: row.eventId,
    kind: row.kind,
    body: deleted ? null : row.body,
    imageUrl: deleted ? null : row.imageUrl,
    replyToId: row.replyToId,
    clientId: row.clientId,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    deleted,
    sender: row.senderId
      ? {
          id: row.senderId,
          name: displayName(row),
          handle: row.instagramHandle,
          photoUrl: row.profilePhotoUrl,
          isAdmin: row.senderRole === 'ADMIN'
        }
      : null
  };
}

export function createStore(pool) {
  return {
    async getSessionVersion() {
      const { rows } = await pool.query(
        `SELECT "value" FROM "GlobalSetting" WHERE "key" = 'sessionVersion'`
      );
      return rows[0]?.value || '1';
    },

    async getUser(userId) {
      const { rows } = await pool.query(
        `SELECT "id", "role", "chatBannedAt", "firstName", "lastName", "preferredName",
                "shareFirstName", "name", "instagramHandle", "profilePhotoUrl"
           FROM "User" WHERE "id" = $1`,
        [userId]
      );
      return rows[0] || null;
    },

    // Returns { event, canRead, canPost, signup } for a user and event.
    async getAccess(user, eventId) {
      const { rows } = await pool.query(
        `SELECT e."id", e."title", e."slug", e."chatEnabled", e."chatLockedAt",
                s."id" AS "signupId", s."status", s."chatMuted"
           FROM "Event" e
           LEFT JOIN "EventSignup" s ON s."eventId" = e."id" AND s."userId" = $2
          WHERE e."id" = $1`,
        [eventId, user.id]
      );
      const row = rows[0];
      if (!row) return { event: null, canRead: false, canPost: false };
      const isAdmin = user.role === 'ADMIN';
      const isMember = row.status === 'CONFIRMED';
      const canRead = isAdmin || (isMember && row.chatEnabled);
      const canPost =
        isAdmin || (canRead && !row.chatLockedAt && !user.chatBannedAt);
      return { event: row, canRead, canPost, isAdmin, muted: Boolean(row.chatMuted) };
    },

    // Rooms a member can see, newest activity first, with unread counts.
    async listRooms(user) {
      const isAdmin = user.role === 'ADMIN';
      const { rows } = await pool.query(
        `SELECT e."id" AS "eventId", e."title", e."slug", e."startTime", e."coverImageUrl",
                e."chatLockedAt", s."chatMuted", s."chatLastReadAt",
                lm."createdAt" AS "lastAt", lm."body" AS "lastBody", lm."kind" AS "lastKind",
                (SELECT count(*)::int FROM "ChatMessage" m
                  WHERE m."eventId" = e."id" AND m."deletedAt" IS NULL
                    AND (m."userId" IS NULL OR m."userId" <> $1)
                    AND m."createdAt" > COALESCE(s."chatLastReadAt", 'epoch')) AS "unread"
           FROM "Event" e
           LEFT JOIN "EventSignup" s ON s."eventId" = e."id" AND s."userId" = $1
           LEFT JOIN LATERAL (
             SELECT m."createdAt", m."body", m."kind" FROM "ChatMessage" m
              WHERE m."eventId" = e."id" AND m."deletedAt" IS NULL
              ORDER BY m."createdAt" DESC LIMIT 1
           ) lm ON true
          WHERE e."chatEnabled" = true
            AND ($2::boolean OR s."status" = 'CONFIRMED')
          ORDER BY COALESCE(lm."createdAt", e."startTime") DESC`,
        [user.id, isAdmin]
      );
      return rows;
    },

    async history(eventId, before, limit = PAGE_SIZE) {
      const { rows } = await pool.query(
        `SELECT m.*, ${SENDER_COLUMNS}
           FROM "ChatMessage" m
           LEFT JOIN "User" u ON u."id" = m."userId"
          WHERE m."eventId" = $1 AND ($2::timestamp IS NULL OR m."createdAt" < $2)
          ORDER BY m."createdAt" DESC
          LIMIT $3`,
        [eventId, before || null, limit]
      );
      return rows.reverse().map(shapeMessage);
    },

    async insertMessage({ eventId, userId, kind = 'TEXT', body, imageUrl, replyToId, clientId }) {
      const id = newId();
      const { rows } = await pool.query(
        `INSERT INTO "ChatMessage" ("id", "eventId", "userId", "kind", "body", "imageUrl", "replyToId", "clientId")
         VALUES ($1, $2, $3, $4::"ChatMessageKind", $5, $6, $7, $8)
         ON CONFLICT ("eventId", "clientId") DO NOTHING
         RETURNING "id"`,
        [id, eventId, userId, kind, body ?? null, imageUrl ?? null, replyToId ?? null, clientId ?? null]
      );
      // Duplicate clientId = the client retried a send that already landed.
      const messageId = rows[0]?.id;
      const lookup = messageId
        ? { sql: `m."id" = $1`, args: [messageId] }
        : { sql: `m."eventId" = $1 AND m."clientId" = $2`, args: [eventId, clientId] };
      const full = await pool.query(
        `SELECT m.*, ${SENDER_COLUMNS} FROM "ChatMessage" m
           LEFT JOIN "User" u ON u."id" = m."userId" WHERE ${lookup.sql}`,
        lookup.args
      );
      return { message: shapeMessage(full.rows[0]), duplicate: !messageId };
    },

    async getMessage(messageId) {
      const { rows } = await pool.query(`SELECT * FROM "ChatMessage" WHERE "id" = $1`, [messageId]);
      return rows[0] || null;
    },

    async softDelete(messageId) {
      await pool.query(`UPDATE "ChatMessage" SET "deletedAt" = now() WHERE "id" = $1`, [messageId]);
    },

    async markRead(eventId, userId) {
      await pool.query(
        `UPDATE "EventSignup" SET "chatLastReadAt" = now() WHERE "eventId" = $1 AND "userId" = $2`,
        [eventId, userId]
      );
    },

    async setMuted(eventId, userId, muted) {
      await pool.query(
        `UPDATE "EventSignup" SET "chatMuted" = $3 WHERE "eventId" = $1 AND "userId" = $2`,
        [eventId, userId, Boolean(muted)]
      );
    },

    async report(messageId, reporterId, reason) {
      await pool.query(
        `INSERT INTO "ChatReport" ("id", "messageId", "reporterId", "reason")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("messageId", "reporterId") DO UPDATE SET "reason" = EXCLUDED."reason"`,
        [newId(), messageId, reporterId, reason ? String(reason).slice(0, 500) : null]
      );
    },

    async block(blockerId, blockedId) {
      await pool.query(
        `INSERT INTO "UserBlock" ("blockerId", "blockedId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [blockerId, blockedId]
      );
    },

    async unblock(blockerId, blockedId) {
      await pool.query(`DELETE FROM "UserBlock" WHERE "blockerId" = $1 AND "blockedId" = $2`, [
        blockerId,
        blockedId
      ]);
    },

    async blockedIds(userId) {
      const { rows } = await pool.query(`SELECT "blockedId" FROM "UserBlock" WHERE "blockerId" = $1`, [
        userId
      ]);
      return rows.map((r) => r.blockedId);
    },

    // Push targets for a new message: confirmed, unmuted members (and admins for
    // announcements are already members or will see it in-app), excluding the
    // sender, anyone who blocked the sender, and users who are online in the room.
    async pushTargets(eventId, senderId, { includeMuted = false, excludeUserIds = [] } = {}) {
      const { rows } = await pool.query(
        `SELECT t."token", t."userId"
           FROM "EventSignup" s
           JOIN "PushToken" t ON t."userId" = s."userId"
          WHERE s."eventId" = $1 AND s."status" = 'CONFIRMED'
            AND ($2::text IS NULL OR s."userId" <> $2)
            AND ($3::boolean OR s."chatMuted" = false)
            AND NOT (s."userId" = ANY($4::text[]))
            AND NOT EXISTS (SELECT 1 FROM "UserBlock" b
                             WHERE b."blockerId" = s."userId" AND b."blockedId" = $2)`,
        [eventId, senderId, includeMuted, excludeUserIds]
      );
      return rows;
    },

    async deletePushTokens(tokens) {
      if (!tokens.length) return;
      await pool.query(`DELETE FROM "PushToken" WHERE "token" = ANY($1::text[])`, [tokens]);
    }
  };
}
