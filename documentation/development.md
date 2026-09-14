# Development Workflow & Commands

## Prerequisites
- Node.js 18+
- npm (bundled with Node)
- PostgreSQL database (Neon, Supabase, Railway, etc.)
- OpenSSL (for generating secrets)

## Initial Setup
```bash
npm install
cp .env.example .env        # or .env.local if preferred
```

Populate environment variables:
- `DATABASE_URL` – Postgres connection string (include `sslmode=require` for hosted DBs).
- `NEXTAUTH_SECRET` – Run `openssl rand -base64 32` to generate.
- `NEXTAUTH_URL` – `http://localhost:3000` during development. In production, comma-separate multiple allowed domains (e.g. `https://manchestergents.com,https://www.manchestergents.com,https://mcr.gents`).
- Optional seed overrides: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_HANDLE`.
- Cloudinary uploads: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (required for private profile photos).
- Uploaded photos are stored in Cloudinary under the `manchester-gents/profiles/*` folders. The `original` variant keeps the full-resolution suited reference; the `cropped` variant is a 400×400 PNG served to the app for fast avatar rendering.

## Prisma / Database
Generate client:
```bash
npm run prisma:generate
```

Apply migrations (development):
```bash
npx prisma migrate dev --name <migration_name>
```

Seed database:
```bash
npm run prisma:seed
```

Regenerate client after schema changes:
```bash
npm run prisma:generate
```

## Running the App
```bash
npm run dev
```
Accessible at `http://localhost:3000`. If port 3000 is in use, specify a port: `npm run dev -- --port 3001`.

## Linting / Formatting
- ESLint configured via Next.js (`npm run lint`).
- No enforced formatter yet; adopt Prettier if desired and note in this doc.

## Testing
- Currently none. Recommended to add:
  - Component/unit tests with Jest/RTL.
  - Integration tests for API routes using Next.js testing utilities or supertest.
Update this document when test infrastructure is added.

## Deployment
1. Push repository to VCS (GitHub/GitLab).
2. On Vercel, import repository and set environment variables.
3. Build command defaults (`npm run build`), output `.next`.
4. After deploy, run:
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed   # optional, ensures admin account exists
   ```
5. Verify `/admin`, `/profile`, `/events/[slug]` behave as expected on production DB.

## Common Tasks
- **Add event fields:** Update Prisma schema, admin form (`AdminEventForm`), event detail page, relevant docs.
- **Modify consents:** Update Prisma schema, `registerSchema`, `profileUpdateSchema`, `AuthForm`, `ProfileForm`, and docs (`auth-and-consent.md`, `data-model.md`).
- **Introduce new API:** Implement handler, update `api-reference.md`, adjust UI, and note any data model changes.

## Troubleshooting
- **Prisma P1012 (missing `DATABASE_URL`):** Ensure `.env` exists with connection string; Prisma only autoloads `.env`.
- **Port is busy:** `lsof -i :3000` then `kill <PID>` or run on a different port.
- **NextAuth provider errors:** Confirm project uses CommonJS (`package.json` without `"type": "module"`) and `next.config.js` exports via `module.exports`.
- **Migration failures on hosted DB:** Ensure DB accepts connections (Neon may require password auth toggle).

## Workflow for LLM or Contributors
1. Review `documentation/overview.md` and `architecture.md` for context.
2. Consult `data-model.md` before changing schema.
3. Update docs as you modify code; treat documentation as source of truth.
4. When finished, summarise modifications in `README.md` or commit message.

## Commands Quick Reference
| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Start dev server | `npm run dev` |
| Lint | `npm run lint` |
| Prisma generate | `npm run prisma:generate` |
| Prisma migrate (dev) | `npx prisma migrate dev --name <name>` |
| Prisma migrate (deploy) | `npx prisma migrate deploy` |
| Seed DB | `npm run prisma:seed` |

Keep this document updated whenever commands, tooling, or workflows change.***
