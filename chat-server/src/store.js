// All database access for the chat server. Uses the same Postgres database
// (and Prisma-created tables) as the Manchester Gents site.
import { randomBytes } from 'node:crypto';

export const PAGE_SIZE = 50;

export function newId() {
  return 'c' + Date.now().toString(36) + randomBytes(8).toString('hex');
}

export function directKey(a, b) {
  return [a, b].sort().join(':');
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

function shapePerson(row, prefix = '') {
  const get = (k) => row[prefix + k];
  if (!get('Id')) return null;
  return {
    id: get('Id'),
    name: displayName({
      preferredName: get('PreferredName'),
      firstName: get('FirstName'),
      lastName: get('LastName'),
      shareFirstName: get('ShareFirstName'),
      name: get('Name'),
      instagramHandle: get('InstagramHandle')
    }),
    handle: get('InstagramHandle'),
    photoUrl: get('ProfilePhotoUrl')
  };
}

export function shapeMessage(row) {
  const deleted = Boolean(row.deletedAt);
  return {
    id: row.id,
    roomId: row.roomId,
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
  const one = async (sql, args) => (await pool.query(sql, args)).rows[0] || null;

  return {
    async getSessionVersion() {
      const row = await one(`SELECT "value" FROM "GlobalSetting" WHERE "key" = 'sessionVersion'`);
      return row?.value || '1';
    },

    async getUser(userId) {
      return one(
        `SELECT "id", "role", "chatBannedAt", "isPlaceholder", "firstName", "lastName", "preferredName",
                "shareFirstName", "name", "instagramHandle", "profilePhotoUrl"
           FROM "User" WHERE "id" = $1`,
        [userId]
      );
    },

    async eventRoom(eventId) {
      const event = await one(`SELECT "id" FROM "Event" WHERE "id" = $1`, [eventId]);
      if (!event) return null;
      await pool.query(
        `INSERT INTO "ChatRoom" ("id", "kind", "eventId") VALUES ($1, 'EVENT', $2)
         ON CONFLICT ("eventId") DO NOTHING`,
        [newId(), eventId]
      );
      return one(`SELECT * FROM "ChatRoom" WHERE "eventId" = $1`, [eventId]);
    },

    async directRoom(userA, userB) {
      const key = directKey(userA, userB);
      await pool.query(
        `INSERT INTO "ChatRoom" ("id", "kind", "directKey") VALUES ($1, 'DIRECT', $2)
         ON CONFLICT ("directKey") DO NOTHING`,
        [newId(), key]
      );
      const room = await one(`SELECT * FROM "ChatRoom" WHERE "directKey" = $1`, [key]);
      await pool.query(
        `INSERT INTO "ChatRoomMember" ("roomId", "userId") VALUES ($1, $2), ($1, $3)
         ON CONFLICT DO NOTHING`,
        [room.id, userA, userB]
      );
      return room;
    },

    async roomIdForEvent(eventId) {
      return (await one(`SELECT "id" FROM "ChatRoom" WHERE "eventId" = $1`, [eventId]))?.id || null;
    },

    // Is either user blocking the other?
    async blockedBetween(a, b) {
      return Boolean(
        await one(
          `SELECT 1 AS x FROM "UserBlock"
            WHERE ("blockerId" = $1 AND "blockedId" = $2) OR ("blockerId" = $2 AND "blockedId" = $1)`,
          [a, b]
        )
      );
    },

    // { room, canRead, canPost, isAdmin, muted, title, otherUserId }
    async getAccess(user, roomId) {
      const row = await one(
        `SELECT r.*, e."title", e."chatEnabled", e."chatLockedAt",
                s."status" AS "signupStatus", m."muted", m."userId" AS "memberId"
           FROM "ChatRoom" r
           LEFT JOIN "Event" e ON e."id" = r."eventId"
           LEFT JOIN "EventSignup" s ON s."eventId" = r."eventId" AND s."userId" = $2
           LEFT JOIN "ChatRoomMember" m ON m."roomId" = r."id" AND m."userId" = $2
          WHERE r."id" = $1`,
        [roomId, user.id]
      );
      const denied = { room: row, canRead: false, canPost: false };
      if (!row) return denied;
      const isAdmin = user.role === 'ADMIN';
      const muted = Boolean(row.muted);

      if (row.kind === 'EVENT') {
        const isMember = row.signupStatus === 'CONFIRMED';
        const canRead = isAdmin || (isMember && row.chatEnabled);
        const canPost = isAdmin || (canRead && !row.chatLockedAt && !user.chatBannedAt);
        return { room: row, canRead, canPost, isAdmin, muted, title: row.title, eventId: row.eventId };
      }

      // DIRECT: only the two members; nobody else, admins included.
      if (!row.memberId) return denied;
      const otherUserId = row.directKey.split(':').find((id) => id !== user.id) || user.id;
      const blocked = await this.blockedBetween(user.id, otherUserId);
      return {
        room: row,
        canRead: true,
        canPost: !blocked && !user.chatBannedAt,
        isAdmin,
        muted,
        otherUserId
      };
    },

    // Event chats the member can see plus their DMs, newest activity first.
    async listRooms(user) {
      const isAdmin = user.role === 'ADMIN';
      const { rows } = await pool.query(
        `WITH visible AS (
           SELECT r.* FROM "ChatRoom" r
             JOIN "Event" e ON e."id" = r."eventId"
             LEFT JOIN "EventSignup" s ON s."eventId" = e."id" AND s."userId" = $1
            WHERE r."kind" = 'EVENT' AND e."chatEnabled" AND ($2::boolean OR s."status" = 'CONFIRMED')
           UNION ALL
           SELECT r.* FROM "ChatRoom" r
             JOIN "ChatRoomMember" m ON m."roomId" = r."id" AND m."userId" = $1
            WHERE r."kind" = 'DIRECT' AND r."lastMessageAt" IS NOT NULL
         )
         SELECT v."id", v."kind", v."eventId", v."lastMessageAt",
                e."title", e."slug", e."startTime", e."coverImageUrl",
                me."muted",
                o."id" AS "otherId", o."firstName" AS "otherFirstName", o."lastName" AS "otherLastName",
                o."preferredName" AS "otherPreferredName", o."shareFirstName" AS "otherShareFirstName",
                o."name" AS "otherName", o."instagramHandle" AS "otherInstagramHandle",
                o."profilePhotoUrl" AS "otherProfilePhotoUrl",
                lm."body" AS "lastBody", lm."kind" AS "lastKind",
                (SELECT count(*)::int FROM "ChatMessage" m
                  WHERE m."roomId" = v."id" AND m."deletedAt" IS NULL
                    AND (m."userId" IS NULL OR m."userId" <> $1)
                    AND m."createdAt" > COALESCE(me."lastReadAt", 'epoch')) AS "unread"
           FROM visible v
           LEFT JOIN "Event" e ON e."id" = v."eventId"
           LEFT JOIN "ChatRoomMember" me ON me."roomId" = v."id" AND me."userId" = $1
           LEFT JOIN "User" o ON v."kind" = 'DIRECT'
                AND o."id" = (SELECT x FROM unnest(string_to_array(v."directKey", ':')) x WHERE x <> $1 LIMIT 1)
           LEFT JOIN LATERAL (
             SELECT m."body", m."kind" FROM "ChatMessage" m
              WHERE m."roomId" = v."id" AND m."deletedAt" IS NULL
              ORDER BY m."createdAt" DESC LIMIT 1
           ) lm ON true
          ORDER BY COALESCE(v."lastMessageAt", e."startTime") DESC`,
        [user.id, isAdmin]
      );
      return rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        eventId: r.eventId,
        title: r.kind === 'EVENT' ? r.title : shapePerson(r, 'other')?.name,
        slug: r.slug,
        startTime: r.startTime,
        coverImageUrl: r.coverImageUrl,
        other: r.kind === 'DIRECT' ? shapePerson(r, 'other') : null,
        muted: Boolean(r.muted),
        lastMessageAt: r.lastMessageAt,
        lastBody: r.lastBody,
        lastKind: r.lastKind,
        unread: r.unread
      }));
    },

    async history(roomId, before, limit = PAGE_SIZE) {
      const { rows } = await pool.query(
        `SELECT m.*, ${SENDER_COLUMNS}
           FROM "ChatMessage" m
           LEFT JOIN "User" u ON u."id" = m."userId"
          WHERE m."roomId" = $1 AND ($2::timestamp IS NULL OR m."createdAt" < $2)
          ORDER BY m."createdAt" DESC
          LIMIT $3`,
        [roomId, before || null, limit]
      );
      return rows.reverse().map(shapeMessage);
    },

    async insertMessage({ roomId, userId, kind = 'TEXT', body, imageUrl, replyToId, clientId }) {
      const inserted = await one(
        `INSERT INTO "ChatMessage" ("id", "roomId", "userId", "kind", "body", "imageUrl", "replyToId", "clientId")
         VALUES ($1, $2, $3, $4::"ChatMessageKind", $5, $6, $7, $8)
         ON CONFLICT ("roomId", "clientId") DO NOTHING
         RETURNING "id"`,
        [newId(), roomId, userId, kind, body ?? null, imageUrl ?? null, replyToId ?? null, clientId ?? null]
      );
      if (inserted) {
        await pool.query(`UPDATE "ChatRoom" SET "lastMessageAt" = now() WHERE "id" = $1`, [roomId]);
      }
      // No row = the client retried a send that already landed; return the original.
      const full = await one(
        `SELECT m.*, ${SENDER_COLUMNS} FROM "ChatMessage" m
           LEFT JOIN "User" u ON u."id" = m."userId"
          WHERE ${inserted ? `m."id" = $1` : `m."roomId" = $1 AND m."clientId" = $2`}`,
        inserted ? [inserted.id] : [roomId, clientId]
      );
      return { message: shapeMessage(full), duplicate: !inserted };
    },

    async getMessage(messageId) {
      return one(`SELECT * FROM "ChatMessage" WHERE "id" = $1`, [messageId]);
    },

    async softDelete(messageId) {
      await pool.query(`UPDATE "ChatMessage" SET "deletedAt" = now() WHERE "id" = $1`, [messageId]);
    },

    async markRead(roomId, userId) {
      await pool.query(
        `INSERT INTO "ChatRoomMember" ("roomId", "userId", "lastReadAt") VALUES ($1, $2, now())
         ON CONFLICT ("roomId", "userId") DO UPDATE SET "lastReadAt" = now()`,
        [roomId, userId]
      );
    },

    async setMuted(roomId, userId, muted) {
      await pool.query(
        `INSERT INTO "ChatRoomMember" ("roomId", "userId", "muted") VALUES ($1, $2, $3)
         ON CONFLICT ("roomId", "userId") DO UPDATE SET "muted" = $3`,
        [roomId, userId, Boolean(muted)]
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

    // Push targets for a new message, excluding the sender, muted members (unless
    // it's an announcement), anyone who blocked the sender, and people online in the room.
    async pushTargets(access, senderId, { includeMuted = false, excludeUserIds = [] } = {}) {
      // Every $n must be referenced: the pg driver rejects unused parameters.
      const isEvent = access.room.kind === 'EVENT';
      const recipients = isEvent
        ? `SELECT s."userId" FROM "EventSignup" s
            WHERE s."eventId" = $5 AND s."status" = 'CONFIRMED'`
        : `SELECT m."userId" FROM "ChatRoomMember" m WHERE m."roomId" = $1`;
      const args = [access.room.id, senderId, includeMuted, excludeUserIds];
      if (isEvent) args.push(access.room.eventId);
      const { rows } = await pool.query(
        `SELECT t."token", t."userId"
           FROM (${recipients}) r
           JOIN "PushToken" t ON t."userId" = r."userId"
           LEFT JOIN "ChatRoomMember" me ON me."roomId" = $1 AND me."userId" = r."userId"
          WHERE r."userId" <> $2
            AND ($3::boolean OR COALESCE(me."muted", false) = false)
            AND NOT (r."userId" = ANY($4::text[]))
            AND NOT EXISTS (SELECT 1 FROM "UserBlock" b
                             WHERE b."blockerId" = r."userId" AND b."blockedId" = $2)`,
        args
      );
      return rows;
    },

    async deletePushTokens(tokens) {
      if (!tokens.length) return;
      await pool.query(`DELETE FROM "PushToken" WHERE "token" = ANY($1::text[])`, [tokens]);
    }
  };
}
