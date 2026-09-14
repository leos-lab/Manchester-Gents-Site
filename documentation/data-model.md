# Data Model Reference (Prisma + Domain)

## Entities

### User
Stores member identity, authentication, and consent preferences.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` (cuid) | Primary key. |
| `email` | `String` | Unique, lower-case. Used for login + comms. |
| `instagramHandle` | `String` | Unique handle without leading `@`. |
| `passwordHash` | `String` | Bcrypt hash. |
| `firstName` | `String?` | Member’s real first name (required on signup). |
| `lastName` | `String?` | Member’s real last name (required on signup). |
| `preferredName` | `String?` | Alternative name used when the member opts not to share their first name (required if `shareFirstName` is false). |
| `name` | `String?` | Computed display name (preferred or first name based on privacy setting). |
| `fullName` | `String?` | Convenience string combining first and last name. |
| `shareFirstName` | `Boolean` | Whether first name can be shown to other members. |
| `phoneNumber` | `String?` | Optional contact number. |
| `profilePhotoUrl` | `String?` | Cropped Cloudinary avatar (400×400 PNG) used in admin/member UI. |
| `profilePhotoOriginalUrl` | `String?` | Full-resolution Cloudinary upload kept private for the admin team when editing imagery. |
| `generalPhotoConsent` | `Boolean?` | Consent for any media capture (may be `null` for placeholders or when not set). |
| `groupFaceConsent` | `Boolean?` | Consent for including face in group shots (nullable for placeholders). |
| `otherFaceConsent` | `Boolean?` | Consent for close-ups / individual shots (nullable). |
| `taggingConsent` | `Boolean?` | OK to tag on social posts (nullable). |
| `isPlaceholder` | `Boolean` | Marks lightweight records created for historical attendees. |
| `termsConsentCulture`, `termsSafeSpace`, `termsNoHate`, `termsPrivacy`, `termsGuidelines` | `Boolean` | Individual agreements to key guidelines. |
| `termsAgreed` | `Boolean` | Derived flag indicating all terms are acknowledged. |
| `termsSignedAt` | `DateTime?` | Timestamp of the latest consent agreement. |
| `consentUpdatedAt` | `DateTime?` | Timestamp of last overall consent/profile update. |
| `role` | `Role` enum (`MEMBER`/`ADMIN`) | Access control. |
| `eventsSignedUp` | `EventSignup[]` | RSVPs. |
| `passwordResetTokens` | `PasswordResetToken[]` | Reset token records (cascade delete). |
| `createdAt`, `updatedAt` | `DateTime` | Automatic timestamps. |

### Event
Represents a social experience members can RSVP for.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` | cuid. |
| `slug` | `String` unique | Friendly URL id (`/events/[slug]`). |
| `title`, `subtitle`, `description` | `String` | Marketing copy. |
| `location` | `String?` | Venue details. |
| `startTime`, `endTime` | `DateTime` | Scheduling. |
| `groupChatLink` | `String?` | Optional URL to the attendee chat for quick access post-RSVP. |
| `threadId` | `String?` | Instagram DM thread id used by the automation service. |
| `galleryUrl` | `String?` | Optional URL to the post-event photo gallery. |
| `primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `textColor` | `String?` | Theme palette values. |
| `coverImageUrl` | `String?` | Optional hero asset. |
| `signupDeadline` | `DateTime?` | RSVP cutoff. |
| `capacity` | `Int?` | Optional cap (soft enforcement). |
| `published` | `Boolean` | Visibility toggle. |
| `attendees` | `EventSignup[]` | RSVP records. |
| `createdAt`, `updatedAt` | `DateTime` | Timestamps. |

### EventSignup
Represents a member’s reservation for a specific event.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` | cuid. |
| `userId`, `eventId` | `String` | FK references with cascade delete. |
| `status` | `SignupStatus` enum (`CONFIRMED`, `WAITLISTED`, `CANCELLED`) | Default confirmed. |
| `note` | `String?` | Future extension placeholder. |
| `specialRequests` | `String?` | Member-provided note captured per RSVP. |
| `createdAt` | `DateTime` | Timestamp of reservation. |

### PasswordResetToken
Tracks password reset links issued to members.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` | cuid. |
| `tokenHash` | `String` unique | SHA-256 hash of the reset token. |
| `userId` | `String` | FK to `User` (cascade delete). |
| `expiresAt` | `DateTime` | Expiry timestamp (defaults to 60 minutes ahead). |
| `usedAt` | `DateTime?` | Marked when consumed; prevents reuse. |
| `createdAt` | `DateTime` | Timestamp when the token was issued. |

### Enums
- `Role`: `MEMBER`, `ADMIN`.
- `SignupStatus`: `CONFIRMED`, `WAITLISTED`, `CANCELLED`.

## Consent Strategy
- All long-lived consents sit on `User`. RSVP records only capture per-event requests.
- `termsAgreed` is set when all boolean guidelines are `true`.
- `termsSignedAt` and `consentUpdatedAt` update on registration and profile edits.
- Registration requires agreeing to all terms and selecting each photo preference upfront.
- API guards (`/api/events/[eventId]/signup`) validate `termsAgreed` before creating RSVPs.
- Private reference photos are stored via `profilePhotoUrl` and never shown in member-facing UI.

## Common Queries
- **Fetch next event:** `prisma.event.findMany` ordered by `startTime`, limited to future/published (see `app/page.js`).
- **Event detail with attendees:** `prisma.event.findUnique({ include: { attendees: { include: { user: { select: {...} } } } } })`.
- **User dashboard:** `prisma.eventSignup.findMany` + `prisma.event.findMany` for recommendations.
- **Profile load:** `prisma.user.findUnique` selecting consents and contact fields.

## Migration Workflow
1. Update `prisma/schema.prisma`.
2. Create migration (`npx prisma migrate dev --name <change>`).
3. Regenerate client (`npm run prisma:generate`).
4. Seed if necessary (`npm run prisma:seed`).
5. Document schema changes in `/documentation/data-model.md` and `auth-and-consent.md`.

## Seed Data
`prisma/seed.js` seeds:
- Admin user with fully accepted consents.
- Example event (`evening-of-style`) with palette + schedule.
Override admin credentials via `SEED_ADMIN_*` env vars before running `npm run prisma:seed`.

## Future Considerations
- If introducing waitlists or ticketing, expand `EventSignup` with additional status metadata.
- Consider history tables or audit logs if consent changes must be tracked over time.
- For integrations, surface `consentUpdatedAt` to external systems to know when to refresh preferences.***
