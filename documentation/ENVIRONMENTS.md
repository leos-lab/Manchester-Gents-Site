# Environments

Three environments, each with its own database, chat server, photo site and app build.

| | Dev | UAT | Prod |
|---|---|---|---|
| Website | `next dev` on your Mac (LAN IP, port 3000) | Vercel `mg-uat` → uat.manchestergents.com | Vercel `mg-new` → manchestergents.com |
| Database (Neon) | branch `dev` (ep-raspy-silence) | branch `uat` (ep-autumn-surf) | branch `production` (ep-square-truth) |
| Chat server (N100, `mg-chat`) | `chat` service, chat.manchestergents.com | `chat-uat` service, chat-uat.manchestergents.com | not set up yet |
| Pinstripe site | `manchestergents` (shared with prod) | `manchestergents-uat` | `manchestergents` |
| App | `APP_VARIANT=development`, `com.manchestergents.app.dev`, DEV badge | `APP_VARIANT=uat` / EAS profile `uat`, `com.manchestergents.app.uat`, UAT badge | EAS profile `production`, `com.manchestergents.app` |
| Email | to uat@manchestergents.com (`EMAIL_REDIRECT_TO`) | to uat@manchestergents.com (`EMAIL_REDIRECT_TO`) | to members |

All apps are called MCR Gents and install side by side.

## Rules

- Never run migrations against `production`. Migrate dev, then UAT, over the direct (non-pooler) URL. Before each one, check the host.
- Dev and UAT hold real member emails. `EMAIL_REDIRECT_TO` must stay set on both so test emails never reach members.
- UAT deploys with `vercel deploy --prod` from the `uat` branch, which is linked to `mg-uat`. `.vercelignore` keeps the app and chat server out of the upload.
- The UAT chat server reads `chat-server/.env.uat` on the N100. It runs because `COMPOSE_PROFILES=uat` is set in `chat-server/.env`.
