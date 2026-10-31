# App API (v1) and chat protocol

Used by the Manchester Gents iOS/Android app, the website's chat, and later
suited.social (via account linking). Keep `/api/v1` backwards compatible; add
`/api/v2` for breaking changes.

## Auth
- `POST /api/v1/auth/login` `{ identifier, password }` → `{ token, user, chatUrl }`.
  Same credentials as the website (email or Instagram handle). The token is an
  HS256 JWT (`lib/chatToken.js`) signed with `CHAT_TOKEN_SECRET`, valid 60 days,
  and dies when an admin bumps the session version ("log everyone out").
- Send it as `Authorization: Bearer <token>`. Website routes still accept the
  NextAuth cookie (`lib/requestUser.js`).
- `GET /api/v1/chat/token` → short-lived chat token for the website's chat page.

## Me
- `GET /api/v1/me` → own profile, incl. `eventsAttended`.
- `PATCH /api/v1/me` `{ bio?, preferredName?, shareFirstName?, instagramHandle? }`
- `DELETE /api/v1/me` `{ password }` → deletes the account and the member's photos (App Store requirement).
- Avatar (public profile picture, via Pinstripe):
  1. `POST /api/v1/me/avatar` → `{ upload: { url, token, kind, field } }`
  2. POST the image to `upload.url` as multipart (`file`, `kind=avatar`) with `Authorization: Bearer <upload.token>` — straight to Pinstripe
  3. `PUT /api/v1/me/avatar` `{ photoId }` → sets it; `DELETE` removes it
- `POST /api/v1/push-tokens` `{ token, platform: "ios"|"android" }` / `DELETE` `{ token }`

## Events
- `GET /api/v1/events?scope=upcoming|past` → cards with `attendeeCount`, `spotsLeft`, `myRsvp`.
- `GET /api/v1/events/:id` → detail; `attendees` only shown to confirmed attendees and admins; `canChat`.
- `POST /api/v1/events/:id/rsvp` `{ specialRequests? }` / `DELETE` → RSVP / cancel.
  Same rules as the website (`lib/rsvp.js`). Confirming joins the event chat.
- `GET /api/v1/events/:id/gallery` → Pinstripe details (`apiBase`, `siteSlug`,
  `eventSlug`, `uploaderName`); the app then lists and uploads photos directly
  with the Pinstripe API, as the website does.

## Members
- `GET /api/v1/members?q=` → search (for starting DMs).
- `GET /api/v1/members/:id` → profile: name, `avatarUrl`, bio, `memberSince`,
  `eventsAttended`, `instagram { handle, url }`, `canMessage`. No posts.
  Never exposes email, phone, consents or the private reference photo.

## Chat (WebSocket, `chat-server/`)
Connect to `wss://<chat host>/ws`, then send `{ "type": "auth", "token": "…" }`
within 10 seconds. Every request may carry a `ref`, echoed in the reply.

| Send | Reply / effect |
|------|----------------|
| `rooms` | `rooms` — event chats + DMs, with `unread`, newest first |
| `join {roomId}` or `join {eventId}` | `joined` — last 50 messages, `canPost`, `muted` |
| `dm {userId}` | `joined` — opens (or creates) the DM with that member |
| `history {roomId, before}` | `history` — 50 older messages |
| `send {roomId, clientId, body?, imageUrl?, replyToId?}` | `sent` to you, `message` to others; retries with the same `clientId` aren't duplicated |
| `announce {roomId, clientId, body}` | admins, event chats only; pushes even to muted members |
| `read {roomId}` · `mute {roomId, muted}` · `typing {roomId}` | |
| `delete {messageId}` | own messages; admins in event chats (not DMs) |
| `report {messageId, reason}` · `block {userId}` · `unblock {userId}` | |

Server-pushed: `message`, `deleted`, `typing`, `removed` (RSVP cancelled),
`rooms_changed`, `error {code, message}`.

Rules: event chats are open to confirmed attendees and admins. Any member can DM
any member. DMs are private to the two people (admins can't read them). A block
in either direction stops both sides posting in that DM and hides the blocked
person's messages in group chats.

## Website → chat server notifications

The website sends `pg_notify('mg_chat', …)` (`lib/chatNotify.js`) so changes
apply to open chats immediately:
- `{ type: "message_deleted", roomId, messageId }` — admin removed a reported message
- `{ type: "user_changed", userId }` — chat ban/unban (the server reloads the member)

## Push from the website

`lib/expoPush.js` sends Expo pushes: RSVP reminders (push first, email
fallback via `lib/email.js`) and a "new event" alert when an admin creates an event. Optional
`EXPO_ACCESS_TOKEN` if enhanced push security is on in the Expo account.
