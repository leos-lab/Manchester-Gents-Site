# Documentation Maintenance Guide (LLM-Friendly)

This repository relies on accurate documentation so that humans and language models can collaborate effectively. Follow the steps below whenever you modify behaviour, schema, or flows.

## Core Principles
1. **Documentation is code.** Treat updates to `/documentation` as mandatory alongside code changes.
2. **Be explicit.** Record assumptions, rationale, and side effects. Avoid ambiguous language.
3. **Link context.** Reference relevant files/paths (e.g., `components/EventSignupButton.js:42`) so models can trace logic.
4. **Keep timelines.** Note when new migrations are added or breaking changes occur.

## Update Checklist
When making changes, choose the relevant documents to update:

| Change Type | Documents to Update |
|-------------|--------------------|
| New feature / page | `overview.md`, `ui-ux.md`, `architecture.md` |
| Prisma schema | `data-model.md`, `development.md`, possibly `auth-and-consent.md`, and include migration file details |
| API endpoint | `api-reference.md`, `architecture.md` (if structural), `overview.md` (if user-facing) |
| Authentication/consent flow | `auth-and-consent.md`, `ui-ux.md`, `data-model.md` |
| Dev tooling/commands | `development.md` |
| Documentation process change | This guide |

## Writing Style
- Use Markdown headings consistently.
- Tables for structured data (e.g., field descriptions).
- Inline code for file paths or commands (`lib/auth.js`).
- Keep sentences concise; prefer bullet lists for complex points.
- Include “Future considerations” to note pending work or ideas.

## Referencing Code
- Use relative paths (e.g., `app/profile/page.js`) with optional line hints (`components/AuthForm.js:120`).
- Mention key functions or components by name.
- Outline side effects or dependencies when relevant.

## Recording Migrations
- For every new migration in `prisma/migrations`, add a note to `data-model.md` describing the change set.
- Mention any required manual steps for prod (e.g., data backfill scripts).

## LLM Collaboration Tips
- Summarise high-level intent before diving into details so future LLMs know the purpose of a change.
- Note any traps or gotchas (e.g., “NextAuth requires CommonJS config”).
- Explicitly state if documentation was verified against running code or if additional validation is needed.

## Structure of Documentation Folder
- `overview.md` – Elevator pitch + map to other docs.
- `architecture.md` – Stack decisions, directories.
- `data-model.md` – Prisma schema narrative.
- `auth-and-consent.md` – Login, consents, RSVP guards.
- `api-reference.md` – Route-by-route explanations.
- `ui-ux.md` – Page & component behaviours.
- `development.md` – Setup, commands, deployment.
- `documentation-guide.md` – This guide.

Add new files if a topic grows complex (e.g., analytics, integrations) and cross-link them from `overview.md`.

## Workflow for Updating Docs
1. Identify impacted areas using the table above.
2. Edit relevant Markdown files with the new information.
3. Cross-check for consistency (e.g., if you add a field, update both data-model and API docs).
4. Mention documentation updates in commit messages / summaries.
5. Encourage reviewers (human or LLM) to ensure docs align with the code diff.

By following these guidelines, future contributors and LLM agents can understand the project quickly and maintain accuracy across the system.***
