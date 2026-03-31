# API Reference (Next.js Route Handlers)

All endpoints live under `app/api`. Requests/Responses use JSON. Errors return `{ error: string }` with appropriate status codes.

## Auth

### `POST /api/register`
- **Purpose:** Create a new user with consent metadata.
- **Payload:** Matches `registerSchema`.
- **Responses:**
  - `201` `{ user: { id, email, instagramHandle } }`
  - `409` if email or handle already exists.
  - `400` if validation fails (handled by Zod).
  - `500` generic failure.
- **Notes:** Password stored hashed; sets all consent booleans, timestamps.

### `POST /api/auth/[...nextauth]`
- NextAuth credentials endpoint (handled automatically).
- Accepts `identifier` and `password` in body (NextAuth request).
- Returns session/JWT cookies on success.

### `POST /api/auth/forgot-password`
- **Purpose:** Issue a password reset link for a member account.
- **Payload:** `{ identifier: string }` (email or Instagram handle) validated with `passwordResetRequestSchema`.
- **Responses:** Always returns `200 { success: true }` when the payload is valid; `400` on validation error; `500` on unexpected failure.
- **Notes:** Does not disclose whether the account exists; skips placeholder users; emails the reset link when SMTP is configured.

### `GET /api/auth/reset-password`
- **Purpose:** Lightweight validity check for a reset token.
- **Query:** `token` (string).
- **Response:** `200 { valid: boolean }` (or `400` when the token is missing).

### `POST /api/auth/reset-password`
- **Purpose:** Finalise a password reset using a valid token.
- **Payload:** `{ token, password }` validated with `passwordResetSchema`.
- **Behaviour:** Verifies that the token is unused/unexpired, updates the user password hash, marks the token as used, clears other tokens, and bumps the session version (signs out existing sessions).
- **Responses:** `200 { success: true }`, `400` when the token is invalid/expired, `500` on server error.

## Profile

### `PATCH /api/profile`
- **Auth:** Requires logged-in member.
- **Payload:** Matches `profileUpdateSchema`.
- **Behaviour:** Updates user record consents, `termsAgreed`, and timestamp fields.
- **Responses:**
  - `200` `{ success: true }`
  - `400` validation error.
  - `401` unauthenticated.
  - `500` server error.
- **Note:** Also updates first/last/preferred names, phone number, and private profile photo URL.

### `POST /api/profile/photo`
- **Auth:** Optional (used by registration and profile flows).
- **Payload:** `multipart/form-data` with fields:
  - `file` – JPEG/PNG/WebP ≤ 5 MB.
  - `variant` – either `original` (default) or `cropped`.
- **Behaviour:** Streams uploads to Cloudinary under `manchester-gents/profiles/{variant}`. `original` retains the member’s full-resolution suited reference; `cropped` normalises to a 400×400 PNG used for avatars.
- **Responses:**
  - `201` `{ url, publicId, variant }`
  - `400` when file missing/invalid.
  - `500` on storage failure.

## Events

### `GET /api/events`
- Returns published events ordered by `startTime`.
- Response: `{ events: Event[] }` (raw Prisma output).

### `POST /api/events`
- **Auth:** Admin only (`requireAuth('ADMIN')`).
- **Payload:** `eventSchema`.
- **Response:** `201 { event }`.

### `PUT /api/events/{eventId}`
- **Auth:** Admin only.
- **Payload:** Partial event object (validated with `eventSchema.partial()`).
- **Response:** `200 { event }`.

### `DELETE /api/events/{eventId}`
- **Auth:** Admin only.
- **Response:** `200 { success: true }`.

### `DELETE /api/admin/events/{eventId}/attendees/{userId}`
- **Auth:** Admin only.
- **Behaviour:** Removes a specific attendee from an event (used by the event admin workspace).
- **Responses:**
  - `200 { success: true }`.
  - `404 { error }` if the RSVP does not exist.
  - `400` when ids are missing.
  - `500` on unexpected failure.

### `POST /sync-attendees`
- **Auth:** Admin only.
- **Payload:** `{ threadId: string, attendees: string[], addMissing: boolean }`.
- **Behaviour:** Normalises attendee usernames (`trim`, remove leading `@`, lowercase), then proxies the request to the Instagram automation service.
- **Responses:**
  - `200` automation JSON payload (includes dry-run fields like `memberCount`, `missingCount`, `missingFromThread`, `resolveErrors`; and add flow fields like `addedUsernames`, `addedUserIds`).
  - `400` validation errors (`No Instagram thread linked to this event.` or `No attendee usernames available to sync.`).
  - upstream non-2xx statuses are forwarded with provider error payload when available.

## Event Signup

### `POST /api/events/{eventId}/signup`
- **Auth:** Logged-in members only.
- **Payload:** `{ specialRequests?: string }` (optional).
- **Guards:**
  - Validates `termsAgreed` on user.
  - Checks deadline, capacity, duplicate RSVPs.
- **Responses:**
  - `201 { signup }` on success.
  - `400` with message when terms not accepted or deadline/capacity violated.
  - `401` unauthenticated.
  - `404` event missing.
  - `500` server error.

### `DELETE /api/events/{eventId}/signup`
- **Auth:** Logged-in members.
- **Behaviour:** Removes matching RSVP via `deleteMany`.
- **Responses:**
  - `200 { success: true }`.
  - `404` if no RSVP existed.
  - `401` unauthenticated.

## Auth Utilities

### `lib/auth.js`
- Exports `authOptions` for NextAuth.
- `requireAuth(role?)` helper returns session or JSON error response.

## Admin Members

### `PATCH /api/admin/members/{userId}`
- **Auth:** Admin only.
- **Payload:** Partial member update (names, contact info, placeholder flag, photo consents).
- **Responses:** `200 { member }`, `400` validation error, `500` server error.

### `DELETE /api/admin/members/{userId}`
- **Auth:** Admin only.
- **Behaviour:** Permanently removes the member record (and cascading RSVPs).
- **Response:** `200 { success: true }` or `500` when the delete fails.

## Error Handling Conventions
- All handlers return JSON responses.
- Validation errors from Zod result in `400` with first issue message when trapped manually.
- Prisma errors logged to server; 500 returned with generic message.

## Adding New Endpoints
1. Create handler under `app/api/{namespace}` in App Router syntax (`route.js`).
2. Use `getServerSession(authOptions)` when auth needed.
3. Validate body with Zod schema in `lib/validators.js`.
4. Update this document with route description.
5. If schema changes, update `documentation/data-model.md`, `auth-and-consent.md`, and any relevant UI docs.***
