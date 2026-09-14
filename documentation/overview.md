# Manchester Gents Platform – Project Overview

## Purpose
Manchester Gents is a members-only social club platform that lets guests:
- Create accounts using their Instagram handles.
- Manage consent preferences (terms & conditions and photo usage) once, centrally.
- Reserve or cancel spots for relaxed suit-and-drink socials at The Lodge in Manchester.
- Explore upcoming meetups and view personalised dashboards.

Administrators can:
- Create and theme events with custom colour palettes.
- Review RSVP activity and rely on centrally stored member consents.

## High-Level Architecture
- **Framework:** Next.js 14 (App Router, server components + client islands).
- **Language:** JavaScript (no TypeScript).
- **Database:** PostgreSQL via Prisma ORM.
- **Authentication:** NextAuth with Credentials provider (email or Instagram handle + password).
- **Styling:** CSS Modules for server components, styled-jsx limited to client components.
- **Hosting target:** Vercel (free tier compatible).

## Key Capabilities
1. **Brand-forward landing page** with countdown to the next Lodge social.
2. **Event catalogue** (list + detail pages) describing each relaxed meetup.
3. **RSVP flow** leveraging stored consents; special requests captured per booking.
4. **Member dashboard** summarising reservations and recommended events.
5. **Profile management** for updating names, private suited photo, consents, and contact info.
6. **Admin interface** for event creation, palette control, member reviews, and ongoing edits.
7. **Post-event community chat checklist** so admins can see who still needs adding to the shared Instagram group after each meetup.

## Directory Map (Top Level)
- `app/` – Next.js App Router pages and layouts.
- `components/` – Shared UI elements (client & server components).
- `lib/` – Prisma client, auth helpers, validation, and consent copy.
- `prisma/` – Schema, migrations, and seed script.
- `documentation/` – This knowledge base for LLMs/contributors.
- `public/` – Static assets (logos, fonts). Member photo uploads are stored externally in Cloudinary.

## Documentation Set
This overview is part of a larger documentation bundle located under `/documentation`. The bundle includes:
- `architecture.md` – Stack decisions, folder responsibilities, environment details.
- `data-model.md` – Prisma models, relational notes, and consent storage logic.
- `api-reference.md` – Route handlers with payload expectations.
- `ui-ux.md` – Page-by-page behaviour and major component notes.
- `development.md` – Setup commands, workflows, and deployment steps.
- `auth-and-consent.md` – Detailed flows for registration, profile updates, and RSVP handling.
- `documentation-guide.md` – How to keep this knowledge base accurate (LLM-friendly).

Use these documents collectively to understand the system and guide feature work. Update relevant sections whenever any behaviour, schema, or API surface changes.***
