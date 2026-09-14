# Authentication & Consent Flows

## Credentials-Based Auth
- **Provider:** NextAuth Credentials (`lib/auth.js`).
- **Identifiers:** Users can sign in with either email or Instagram handle (with or without `@`).
- **Passwords:** Bcrypt hashed with 12 salt rounds (`lib/password.js`).
- **Session strategy:** JWT; session object enriched with `id`, `role`, and `instagramHandle`.
- **Protected routes:** Server components fetch sessions via `getServerSession(authOptions)`; unauthenticated users are redirected (e.g., `/dashboard`, `/profile`, `/admin`).

### Registration Flow
1. **UI:** `components/AuthForm.js` collects email, Instagram handle, password, first & last name, optional preferred name/phone, a private suited photo upload (with in-app circle cropper), and all consent toggles.
2. **Validation:** Client uses Zod schema (`registerValidation`) mirroring `registerSchema`.
3. **API:** `POST /api/register` parses payload with `registerSchema` and creates user with consent metadata.
4. **Auto-login:** After successful creation, the form calls `signIn` silently and redirects to `/dashboard`.
5. **Data stored on User:** First/last name, preferred name, consent booleans, private `profilePhotoUrl`, `termsSignedAt`, and `consentUpdatedAt` set at registration time.

### Login Flow
1. **Form:** `LoginForm` accepts email/Instagram handle + password.
2. **Authentication:** NextAuth checks credentials and loads user via Prisma.
3. **Session:** Session data includes `user.id`, `role`, `instagramHandle`, name metadata, and the computed display name that respects preferred-name privacy.

## Consent Lifecycle

### Storage
- All consent booleans live on the `User` record.
- `termsAgreed` signals that all guideline flags are `true`.
- `termsSignedAt` captures the latest acknowledgement timestamp.
- `consentUpdatedAt` tracks the most recent profile update.
- `profilePhotoOriginalUrl` stores the full-resolution upload; `profilePhotoUrl` stores the cropped, low-resolution Cloudinary asset used for previews (never shared with members).

### Updating Consents
- **Profile Page:** `/profile` surfaces `ProfileOverview` for read-only context and an edit CTA. Selecting edit reveals `ProfileForm`, prefilled from Prisma, allowing updates to names, phone, private photo, and consent toggles.
- **API:** `PATCH /api/profile` validates payload via `profileUpdateSchema` and updates the user row.
- **UI Feedback:** Form displays success/error messaging and shows last updated timestamp.
- **LLM note:** Whenever profile consent fields change, update `profileUpdateSchema`, `ProfileOverview`, `ProfileForm`, and relevant documentation.

### RSVP Requirements
- `POST /api/events/{eventId}/signup` checks:
  1. User is authenticated.
  2. `termsAgreed` is `true` (rejects with guidance to update profile if not).
  3. Signup deadline and capacity constraints.
  4. Whether an RSVP already exists.
- If valid, creates an `EventSignup` record, optionally storing `specialRequests`.
- `DELETE /api/events/{eventId}/signup` removes the RSVP, surfacing user-friendly messages when nothing is found.

### Special Requests
- Optional per-RSVP notes (e.g., dietary needs) can be supplied via the RSVP UI.
- Stored only on `EventSignup.specialRequests`.
- Members can add/remove notes each time they reserve a spot.

## Admin Access Control
- Admins identified by `user.role === 'ADMIN'`.
- Navbar shows an `Admin` link for admins only.
- `requireAuth('ADMIN')` helper (in `lib/auth.js`) is used by admin API routes to guard create/update/delete actions.

## Session Security Notes
- **`NEXTAUTH_SECRET`:** Must be set in all environments; used to sign JWTs.
- **Callback behaviour:** `session` callback injects `role`, `instagramHandle`, `id` into session for easy access.
- **Logout:** Uses `signOut({ callbackUrl: '/' })` returning user to home page.

## Password Resets
- **Request flow:** Members visit `/forgot-password` (form validates `identifier` with `passwordResetRequestSchema`) which POSTs to `/api/auth/forgot-password`. API looks up the user by email/Instagram handle, deletes previous tokens, and creates a new `PasswordResetToken` valid for 60 minutes by default (`PASSWORD_RESET_TOKEN_TTL_MINUTES` override).
- **Delivery:** `sendPasswordResetEmail` sends the reset link via SMTP (`EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`). If SMTP is missing, the link is logged server-side for local testing; it is never returned to the client.
- **Reset flow:** `/reset-password?token=...` surfaces `ResetPasswordForm`, which verifies the token via `GET /api/auth/reset-password?token=` and submits the new password to `POST /api/auth/reset-password` (`passwordResetSchema`). The token must be unused and unexpired.
- **Session hygiene:** After a successful reset, the user’s password hash is updated and `bumpSessionVersion()` invalidates all active sessions, forcing re-authentication.
- **Placeholders:** Placeholder users are ignored for reset requests to avoid emailing throwaway placeholder addresses.

## LLM Guidance
- When modifying authentication (e.g., adding OAuth providers), update:
  - `lib/auth.js`
  - `components/AuthForm.js` and `app/login/page.js`
  - This document (new flows, required fields)
  - `documentation/architecture.md` if stack changes.
- Any consent schema change must be reflected in:
  - Prisma schema & migrations.
  - `registerSchema` / `profileUpdateSchema`.
  - `AuthForm`, `ProfileForm`, `EventSignupButton` (if RSVP requirements change).
  - `documentation/data-model.md` and this file.***
