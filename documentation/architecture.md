# Architecture & Stack Details

## Runtime Overview
- **Next.js 14 (App Router):** Combines server components for data fetching with client components for interactive shells (e.g., forms, RSVP controls).
- **Node.js runtime:** Standard Next.js dev server (`npm run dev`) for local development.
- **Database:** Hosted PostgreSQL (Neon or similar), accessed via Prisma Client.
- **Authentication:** NextAuth with credential-based login (email or Instagram handle + password).
- **Styling:** Global styles in `app/globals.css`, component-level CSS Modules for server-rendered pages, and minimal `styled-jsx` for client components.
- **Media storage:** Cloudinary handles private member reference photos and cropped, low-resolution avatars via the profile photo upload endpoint.

## Key Modules
| Area | Location | Purpose |
|------|----------|---------|
| App shell | `app/layout.js`, `app/globals.css` | Global fonts, background, theme variables. |
| Landing & marketing | `app/page.js`, `components/HeroBanner.js`, `components/EventCard.js` | Render next event hero, countdown, and highlight cards. |
| Events | `app/events`, `components/EventSignupButton.js` | Event list/detail, RSVP actions, palette-driven styling. |
| Dashboard | `app/dashboard/page.js` | Member reservations and recommended events. |
| Profile | `app/profile/page.js`, `components/ProfileOverview.js`, `components/ProfileForm.js` | Member overview with optional consent editor. |
| Admin | `app/admin/page.js`, `components/AdminEventForm.js`, `components/EventAdminWorkspace.js`, `components/CommunityChatChecklist.js` | Event creation, tabbed workspace for admin tools, and the post-event community chat checklist (admin-only). |
| Admin members | `app/admin/members/page.js` | Member directory with consent summaries and reference photos. |
| Authentication | `components/AuthForm.js`, `app/login`, `app/register`, `app/api/auth/[...nextauth]` | Registration/login flows. |
| API routes | `app/api/**/*` | Next.js Route Handlers for registration, login, events CRUD, RSVP operations, consent updates, and private profile photo uploads. |
| Data layer | `prisma/schema.prisma`, `lib/prisma.js`, `prisma/migrations/*` | Prisma schema & generated client. |
| Domain helpers | `lib/auth.js`, `lib/validators.js`, `lib/password.js`, `lib/consentContent.js`, `lib/displayName.js` | Auth config, Zod schemas, hashing, consent copy, display-name utilities. |

## Component Types
- **Server components (default):** Page-level rendering, data fetching, static layout.
- **Client components:** Forms, interactive buttons, stateful modals (`'use client'` at top). Example: `EventSignupButton.js`, `AuthForm.js`, `ProfileOverview.js`, `ProfileForm.js`.

## Styling Approach
- Theme variables defined in `app/globals.css` (brand palette, gradients).
- Typography:
  - Headings use custom Thelorin font loaded locally from `public/fonts/Thelorin.otf` via `next/font/local`, with contextual ligatures enabled to keep connected letterforms.
  - Body text uses Inter (`next/font/google`) for legibility.
- Server-rendered pages use CSS Modules (e.g., `app/page.module.css`) to avoid styled-jsx restrictions.
- Client components may use local `styled-jsx` when stateful styles are needed (e.g., dynamic RSVP button states).

## Environment & Config
- **`next.config.js`:** CommonJS export with image remote patterns and server action origins.
- **`package.json`:** `"type"` intentionally omitted to stay in CommonJS (NextAuth compatibility).
- **`.env` / `.env.local`:** Must include `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`), and optional `SEED_ADMIN_*`. `NEXTAUTH_URL` supports comma-separated domains for multi-host setups.
- **Prisma commands:** Provided via npm scripts (`prisma:generate`, `prisma:migrate`, `prisma:seed`).

## Build & Deployment Notes
- Targeted for Vercel deployment; serverless functions used for API routes.
- Ensure `prisma generate` runs during build (Vercel handles automatically when dependencies installed).
- Post-deploy, run `prisma migrate deploy` against production DB and seed admin user with `npm run prisma:seed` if required.

## Consent Data Placement
- All consent-related booleans stored on `User` records (not on individual RSVPs).
- RSVP records only contain per-booking fields (`specialRequests`, status metadata).
- Profile updates and registration both touch user-level consent metadata.

## Extensibility Considerations
- Add new user preferences by updating `prisma/schema.prisma`, migrations, and `profileUpdateSchema`.
- New events fields require Prisma schema update, admin form adjustments, and UI updates (list/detail views).
- Keep `documentation/` folder synced with schema and API evolutions to preserve clarity for LLM collaborators.***
