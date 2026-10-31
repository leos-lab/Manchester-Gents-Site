# Environments

Three environments, each with its own database, chat server, photo site and app build.

| | Dev | UAT | Prod |
|---|---|---|---|
| Website | Vercel `mg-dev` → dev.manchestergents.com (and `next dev` on your Mac) | Vercel `mg-uat` → uat.manchestergents.com | Vercel `mg-new` → manchestergents.com |
| Database (Neon) | branch `dev` (ep-raspy-silence) | branch `uat` (ep-autumn-surf) | branch `production` (ep-square-truth) |
| Chat server (N100, `mg-chat`) | `chat-dev` service, chat-dev.manchestergents.com | `chat-uat` service, chat-uat.manchestergents.com | not set up yet |
| Pinstripe site | `manchestergents-dev` (still `manchestergents` until it's created) | `manchestergents-uat` | `manchestergents` |
| App | `APP_VARIANT=development`, `com.manchestergents.app.dev`, DEV badge | `APP_VARIANT=uat` / EAS profile `uat`, `com.manchestergents.app.uat`, UAT badge | EAS profile `production`, `com.manchestergents.app` |
| Email | to uat@manchestergents.com (`EMAIL_REDIRECT_TO`) | to uat@manchestergents.com (`EMAIL_REDIRECT_TO`) | to members |

All apps are called MCR Gents and install side by side.

## Rules

- Never run migrations against `production`. Migrate dev, then UAT, over the direct (non-pooler) URL. Before each one, check the host.
- Dev and UAT hold real member emails. `EMAIL_REDIRECT_TO` must stay set on both so test emails never reach members.
- The repo folder is linked to `mg-uat`, so UAT deploys with `vercel deploy --prod` from the `uat` branch. Dev deploys the same way with `VERCEL_ORG_ID=team_gzMFZFoU3wYdvn9FFFcnRaH5 VERCEL_PROJECT_ID=prj_JSwwfxdCcf73ANy3PzLLI1eWXw2g` set. `.vercelignore` keeps the app and chat server out of the upload.
- Each copied environment has its own Pinstripe site. Photo ids there are the live ids with a prefix (`u` for UAT, `d` for dev), and the copied database must point at those ids. Member photos are looked up by id alone, so a database that still holds live ids would show, and could delete, live photos.
- The UAT chat server reads `chat-server/.env.uat` on the N100. It runs because `COMPOSE_PROFILES=uat` is set in `chat-server/.env`.
