# Manchester Gents

A modern members-only experience built with Next.js for the Manchester Gents social club. Members register with their Instagram handle to reserve relaxed Lodge socials — suited gents, good drinks, and easy conversation — while admins fine-tune palettes and scheduling.

## Features
- Countdown-led landing page that highlights the next event.
- Credential-based authentication (email or Instagram handle) with NextAuth.
- Event creation, theming, and scheduling tools for administrators.
- Member dashboard showing reservations and recommended events.
- Members capture terms & photo consents during signup and can revisit them any time from their profile.
- Members can reserve or cancel event spots directly from the event page.
- Post-event community chat checklist that spotlights first-time attendees so admins can invite them into the shared Instagram DM quickly.
- Private suited reference photo upload (kept off-member-facing surfaces) to help the team identify attendees in post-production.
- Admin member directory with consent summaries and reference photos.
- Serverless API routes backed by Prisma and PostgreSQL.
- Ready for Vercel deployment with server actions and dynamic theming.

## Documentation
- Full project knowledge base lives in `/documentation`.
- Start with `documentation/overview.md`, then drill into architecture, data model, API reference, UI/UX, auth & consent flows, and development guide.
- Follow `documentation/documentation-guide.md` whenever the codebase changes so docs stay current.

## Getting started

```bash
npm install
npm run prisma:generate
npm run dev
```

### Environment variables
Copy `.env.example` to `.env.local` and update the values:

```bash
cp .env.example .env.local
```

- `DATABASE_URL` — PostgreSQL connection string (Recommended: Neon, Supabase, Vercel Postgres, or Railway).
- `NEXTAUTH_SECRET` — A 32+ character string (generate with `openssl rand -base64 32`).
- `NEXTAUTH_URL` — `http://localhost:3000` for local development. In production, you can supply a comma-separated list to support multiple domains (e.g. `https://manchestergents.com,https://www.manchestergents.com,https://mcr.gents`).
- `NEXT_PUBLIC_APP_URL` — Canonical public URL for metadata/OG images. If you provide multiple (comma-separated), `manchestergents.com` is preferred when present; otherwise the first valid entry is used.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — credentials for storing private member reference photos.
- Optional seed helpers (`SEED_ADMIN_*`) customise the seeded admin account.

### Database setup
Create your database and run the migrations:

```bash
npm run prisma:generate
npx prisma migrate dev --name init
npm run prisma:seed
```

> **Tip:** Vercel Postgres works well for production. Update `DATABASE_URL` in the Vercel dashboard.

### Admin access
- Seed script creates an admin account using the credentials above.
- Log in with that account, visit `/admin`, and create/update events and their palettes.
- Events are published by default; toggle the colour scheme for each event directly in the admin panel.
- Control the coming-soon gate from the admin dashboard: toggle it on/off and set an auto-disable time (saved in the new `ComingSoonConfig` table). Environment variables still act as a fallback if no record exists.

## Deployment on Vercel
1. Push the repository to GitHub/GitLab/Bitbucket.
2. Create a new Vercel project and import the repo.
3. Add the environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
4. Set the build command to `npm run build` (Vercel default) and output directory to `.next`.
5. After deploy, run `npx prisma migrate deploy` and `npm run prisma:seed` from Vercel CLI or locally against the production database.

## Project structure

```
app/
  api/           → Serverless routes for auth, events, registrations
  (pages)        → Public pages, dashboard, admin panel
components/      → Reusable UI elements
lib/             → Prisma client, auth helpers, validation
prisma/          → Prisma schema and seed script
```

## Customisation
- Update brand colours in `app/globals.css`.
- The heading font is powered by the custom `Thelorin` file in `public/fonts`; body text uses `Inter`. Adjust imports in `app/layout.js`.
- Extend the admin panel or event schema in `prisma/schema.prisma` to capture more details (dress code, pricing, etc.).
- Add CRM integrations or automate waitlists via `app/api/events/[eventId]/signup/route.js`.
- Update the consent copy surfaced to members in `lib/consentContent.js`.

## License
This project is provided as-is for Manchester Gents internal use.
