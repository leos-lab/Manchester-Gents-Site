# Environments

Three environments, each with its own database, chat server, photo site and app build.

| | Dev | UAT | Prod |
|---|---|---|---|
| Git branch | `dev` | `uat` | `main` |
| Website | Vercel `mg-dev` → dev.manchestergents.com (and `next dev` on your Mac) | Vercel `mg-uat` → uat.manchestergents.com | Vercel `mg-new` → manchestergents.com |
| Database (Neon) | branch `dev` (ep-raspy-silence) | branch `uat` (ep-autumn-surf) | branch `production` (ep-square-truth) |
| Chat server (N100, `mg-chat`) | `chat-dev` service + `tunnel-dev`, chat-dev.manchestergents.com | `chat-uat` service + `tunnel-uat`, chat-uat.manchestergents.com | not set up yet (chat.manchestergents.com is kept for it) |
| Pinstripe site | `manchestergents-dev` (parent: live) | `manchestergents-uat` (parent: live) | `manchestergents` |
| App | `APP_VARIANT=development`, `com.manchestergents.app.dev`, DEV badge | `APP_VARIANT=uat` / EAS profile `uat`, `com.manchestergents.app.uat`, UAT badge | EAS profile `production`, `com.manchestergents.app` |
| Email | to uat@manchestergents.com (`EMAIL_REDIRECT_TO`) | to uat@manchestergents.com (`EMAIL_REDIRECT_TO`) | to members |

All apps are called MCR Gents and install side by side.

## Rules

- Changes move `dev` → `uat` → `main`. Work on `dev`. To promote, merge `dev` into `uat` and deploy `mg-uat`, then merge `uat` into `main` for prod.

- Never run migrations against `production`. Migrate dev, then UAT, over the direct (non-pooler) URL. Before each one, check the host.
- Dev and UAT hold real member emails. `EMAIL_REDIRECT_TO` must stay set on both so test emails never reach members.
- The repo folder is linked to `mg-uat`, so UAT deploys with `vercel deploy --prod` from the `uat` branch. Dev deploys the same way with `VERCEL_ORG_ID=team_gzMFZFoU3wYdvn9FFFcnRaH5 VERCEL_PROJECT_ID=prj_JSwwfxdCcf73ANy3PzLLI1eWXw2g` set. `.vercelignore` keeps the app and chat server out of the upload.
- Dev and UAT Pinstripe sites have the live site as their parent. They show all live events and photos, which are marked `inherited`, and their databases keep the live photo ids. Uploads go to their own site and folder. Uploading to a live event creates the site's own event of the same name, so those photos never land in the live event.
- Deletes and photo changes always pass `?site=<own slug>`. Pinstripe refuses them for a photo from another site, so dev and UAT can never change live photos. Keep that query parameter on any new Pinstripe change call.
- The UAT chat server reads `chat-server/.env.uat` on the N100. It runs because `COMPOSE_PROFILES=uat` is set in `chat-server/.env`.
