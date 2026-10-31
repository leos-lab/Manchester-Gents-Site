# Manchester Gents 2027 — handover

Status as of 31 October 2026. Everything below is pushed to GitHub on separate
branches. Nothing is merged into `main`.

---

## 1. What's been done

The goal: move the Manchester Gents group chat off Instagram automation and
into our own app and website, revamp the website for 2027, and build an iOS and
Android app. All photos now live on the Pinstripe API.

### Branches

Each phase is its own branch and builds on the previous one, so you can test
one phase at a time.

| Phase | Repo | Branch | What it adds |
|---|---|---|---|
| 1 | Manchester-Gents-Site | `claude/in-app-chat` | Self-hosted chat server, app API (`/api/v1`), photos moved to Pinstripe, Cloudinary removed |
| 1 | Pinstripe-API | `claude/member-photos` | Member photos: public avatars and private, server-only reference photos with thumb, medium and display sizes |
| 2 | Manchester-Gents-Site | `claude/phase-2-app` | The iOS and Android app (`mobile/`, Expo SDK 58, iOS 27 SDK) |
| 3 | Manchester-Gents-Site | `claude/phase-3` | DMs and photo galleries in the app, admin chat moderation, push reminders |
| 4 | Manchester-Gents-Site | `claude/phase-4-website` | Website v2: photo-led redesign, chat, DMs and member profiles on the web, Instagram automation removed |

### Phase 1: backend

- **Chat server** (`chat-server/`):
  - Node with WebSockets, using the same Postgres database as the site.
  - Built to run on the home server with Docker Compose and a Cloudflare Tunnel.
  - Event group chats: confirming an RSVP joins the chat automatically; cancelling removes you live, through a database trigger.
  - DMs between any two members. These are private; admins can't read them.
  - Admins can post announcements, which push even to members who've muted the chat.
  - Report, block, mute, delete, typing indicators and unread counts.
  - Push notifications go through Expo. Members who are already in the room don't get a push.
- **App API** (`/api/v1/*`):
  - Sign-in uses the same email or Instagram handle and password as the website, and returns a 60-day token.
  - Covers events, RSVP, member profiles (events attended plus an Instagram chip; no posts), member search, push tokens and Pinstripe gallery details.
  - In-app account deletion, which also deletes the member's photos.
  - Documented in `documentation/app-api.md`.
- **Photos:** Cloudinary is gone and every photo goes through Pinstripe.
  - Private reference photos stay on the home server and never reach ImgBB. They're served only to the member and admins, through `/api/member-photos/:id`.
  - Public avatars are a separate, opt-in photo. The private photo is never shown to other members.
  - Sign-up uploads are held as "registration" until the account exists, then claimed. Members can't attach someone else's photo to their own profile.
  - `scripts/migrate-photos-to-pinstripe.mjs` copies existing Cloudinary photos across.
- **RSVPs** no longer call Instagram. The shared logic lives in `lib/rsvp.js`.

### Phase 2: the app (`mobile/`)

- **Platform:** Expo SDK 58, built with the iOS 27 SDK. Native tabs and Liquid Glass on iOS. Layouts resize, with two columns when the iPhone Duo is unfolded.
- **Features:**
  - Sign-in.
  - Upcoming and past events, with RSVP, cancel and an optional note for the hosts.
  - Add to calendar, and see who's going.
- **Event chat:**
  - Messages that fail while you're offline are retried without duplicates.
  - Scroll up for older messages, mute, typing indicators, and admin announcements.
  - Long-press a message to copy, report, block or delete it.
- **Profiles:**
  - Member profiles.
  - Your own profile: avatar uploads straight to Pinstripe, edit your details, sign out, delete your account.
- **Push notifications:** tapping one opens the right chat or event.

### Phase 3

- **DMs in the app:** a Message button on profiles, and "New message" search in the Chats tab.
- **Photo galleries in the app:**
  - Photo grid and a swipeable full-screen viewer.
  - Save to Photos, share, and upload several photos at once, with your name attached.
  - A photo strip on each event page.
- **Website, Admin → Chat reports:** remove a message (it disappears live), remove and ban a member from chat, dismiss a report, or unban.
- **Push:** RSVP reminders go by push to members with the app. New events alert everyone with the app.

### Phase 4: website v2

- **Photo-led design:**
  - The home page hero is three event cover photos cut along the logo's lapels, with gold seams and the Thelorin wordmark across them.
  - Event cards and event pages lead with the cover photo.
  - Gallery photos appear only for signed-in members.
- **New pages:**
  - `/chat`: event chats and DMs in the browser.
  - `/members`: search, defaulting to people you've been to socials with.
  - `/members/:id`: member profile.
- **Navigation:** a Chats link in the nav.
- **Instagram automation removed:**
  - New members get a welcome email instead of a DM.
  - RSVP reminders go by push to app users and by email to everyone else.
  - `lib/instagramAutomation.js` is deleted.

### Bugs found and fixed along the way

These were fixed on the earliest affected branch and merged up through the later ones.

- The nav avatar was broken after photos moved to Pinstripe (phase 1).
- RSVP reminders never went by push, because the admin page always sends a template (phase 3).
- Event pages still showed the old Instagram group-chat link (phase 1).
- Chat would have shown members' private reference photos as avatars. Caught before commit; avatars are now a separate public photo.

---

## 2. What you need to do

### Accounts and keys

- [ ] Generate `CHAT_TOKEN_SECRET` with `openssl rand -base64 48`. Use the same value on the website and the chat server.
- [ ] Expo: create an account, then in `mobile/` run `npx eas-cli login` and `npx eas-cli init`. Put the project id in `mobile/.env` as `EAS_PROJECT_ID`.
- [ ] iOS push: run `npx eas-cli credentials` to set up the APNs key with your Apple Developer account.
- [ ] Android push:
  - Create a Firebase project and add the Android app `com.manchestergents.app`.
  - Download `google-services.json` into `mobile/`.
  - Add the FCM key with `npx eas-cli credentials`.
- [ ] Decide the bundle ID before the first App Store release. It's currently `com.manchestergents.app` and can't be changed afterwards.
- [ ] SMTP settings on the website, for the welcome and reminder emails (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`).

### Environment variables

**Website (Vercel):**

| Variable | Status | Value |
|---|---|---|
| `CHAT_TOKEN_SECRET` | New, required | The same value as the chat server |
| `CHAT_SERVER_URL` | New | e.g. `wss://chat.manchestergents.com/ws` |
| `PINSTRIPE_MANAGEMENT_TOKEN` | Now also used for member photos | Must match Pinstripe |
| `NEXT_PUBLIC_PINSTRIPE_API_URL` | Already set | Pinstripe's address |
| `EXPO_ACCESS_TOKEN` | Optional | Only if enhanced push security is on in Expo |
| `CLOUDINARY_*`, `IG_AUTOMATION_*` | Can be removed | No longer used |

**Chat server** (`chat-server/.env` on the home server; see `chat-server/.env.example`):

| Variable | Value |
|---|---|
| `DATABASE_URL` | The website's database |
| `DIRECT_DATABASE_URL` | The non-pooled address, which database notifications need |
| `CHAT_TOKEN_SECRET` | The same value as the website |
| `ALLOWED_ORIGINS` | Your website's addresses. Without them, browsers can't connect to `/chat`. |
| `CLOUDFLARE_TUNNEL_TOKEN` | From your Cloudflare Tunnel |

**Pinstripe:**

- `PINSTRIPE_MANAGEMENT_TOKEN` must be set; member photos need it.
- `CORS_ALLOWED_ORIGINS` must include the website.

### Deploy order (per phase)

1. **Pinstripe:** deploy `claude/member-photos`. This runs the `member_photos` database update.
2. **Website:** deploy the branch you're testing to a preview, then run `npx prisma migrate deploy`. That runs `20261101090000_in_app_chat`, which also adds the trigger that keeps chat membership in sync with RSVPs.
3. **Existing photos:** run `node scripts/migrate-photos-to-pinstripe.mjs --dry-run` to see what would be copied from Cloudinary, then run it without `--dry-run`.
4. **Chat server:** in `chat-server/`, run `docker compose up -d` on the home server. Check that `/health` returns `ok`.
5. **App:** in `mobile/`, run `cp .env.example .env`, fill it in, then `npm run setup` and `npx expo run:ios --device`.

> I couldn't install packages in my session, so **nothing has been built or run with real dependencies yet**. Run `npm run build` on the website and Pinstripe, and `npx expo-doctor` in `mobile/`, before anything else, and expect a few small fixes.

---

## 3. What to test

The full app checklist is in `mobile/README.md`. Highlights:

### Phase 1 (website and chat server)

- [ ] Registering with a reference photo works. The photo shows in Admin → Members and on your own profile.
- [ ] A member can't see another member's private photo at `/api/member-photos/<id>`; they get a 403.
- [ ] RSVPing on the website doesn't trigger any Instagram activity.
- [ ] An admin "log everyone out" also invalidates app sessions.

### Phase 2 (app)

- [ ] Sign in, see events, RSVP, then open the event chat.
- [ ] Two accounts on two phones: messages arrive live, the typing indicator shows, and the unread badge updates.
- [ ] Turn on airplane mode, send a message, turn it off: the message arrives exactly once.
- [ ] Lock the phone and send from the other account. The push arrives, and tapping it opens the chat.
- [ ] Cancel your RSVP while the chat is open: you're taken out of the chat.
- [ ] Change your avatar, edit your profile, then delete a test account.
- [ ] With the Duo unfolded, events show in two columns.

### Phase 3

- [ ] DM someone you haven't been to an event with. Blocking stops both of you from sending.
- [ ] Gallery: swipe through photos, save one to Photos, upload several.
- [ ] Admin → Chat reports: remove a message (it vanishes live in the app), ban a member (they can't post), then unban.
- [ ] Admin → RSVP reminders: a member with the app gets a push.
- [ ] Creating an event sends a "New event" push.

### Phase 4 (website)

- [ ] Signed out, the home page shows only event cover photos. Signed in, it also shows the photo mosaic.
- [ ] `/chat` works in a browser: event chats, DMs, report and block. It needs `ALLOWED_ORIGINS` set.
- [ ] `/members` search and `/members/<id>` profiles, including the Message button.
- [ ] Registering sends a welcome email. A reminder to a member without the app sends an email.
- [ ] Check the design on a phone and a desktop with real event photos. I could only preview it with stand-in images.

---

## 4. Known gaps and risks

- **Untested builds:** I wrote the Expo SDK 58 code from its docs and couldn't build it. These are the likeliest places to need fixes:
  - `expo-router/native-tabs`, `Stack.Protected` and form sheets.
  - `expo-glass-effect` (`GlassView`).
  - The new `expo-file-system` `File` and `Directory` API.
  - `expo-media-library`.
- **iPhone Duo:** the app relies on responsive layouts only. It doesn't use `ArrangementView` or `expo-hinge` yet.
- **Open uploads (not new):**
  - `/api/profile/photo` accepts uploads without signing in, because registration needs it.
  - Pinstripe's public upload token is open to anyone.
  - Pinstripe's gallery list API is public to anyone who knows an event's slug.
  - Consider rate limiting all three.
- **Legacy database columns:** `groupChatLink`, `threadId`, `groupChatAdded`, `chatValidationCode` and `actionRequiredMessageId` are unused but still in the database. The admin event form still shows the Instagram thread and link fields. Remove them in a later migration.
- **Old pages not redesigned:** the dashboard, profile, login and register pages keep the old design. Only the home, events, event, chat and members pages were redesigned.
- **Test database shim:** the chat server's tests use a small test shim instead of the real `pg` driver, so run them once with real packages installed.
- **Web chat window height:** the chat page assumes the nav is about 80px tall. Adjust `components/chat/ChatApp.module.css` if it isn't.

---

## 5. Handover for the next Claude session

**Context:** Leo's Manchester Gents club. The Next.js 14 website is on Vercel with Postgres and Prisma, and the Pinstripe photo API is self-hosted on his home server. Phases 1–4 above are done. Phase 5 is TestFlight and Play testing, then launch for the first 2027 event. Longer term, Leo's suited.social app (previously merged.social) will connect to Manchester Gents through the same `/api/v1` and chat protocol, using account linking. Keep both backwards compatible.

**Repos:**
- `leos-lab/Manchester-Gents-Site`: the website, `chat-server/` and `mobile/`.
- `leos-lab/Pinstripe-API`: the photo API.

**Branch rules:** keep phases on separate branches. Fix bugs on the earliest affected branch and merge up the chain: `claude/in-app-chat` → `claude/phase-2-app` → `claude/phase-3` → `claude/phase-4-website`. Start phase 5 from `claude/phase-4-website`.

**Map:**

| Area | Where |
|---|---|
| Chat protocol and API reference | `documentation/app-api.md` |
| Phases and notes | `ROADMAP.md` |
| Chat server | `chat-server/src/hub.js` (logic), `store.js` (SQL), `server.js` (WebSocket and database notifications), `push.js` |
| Chat client | `mobile/src/lib/chatClient.js`. **A copy lives at `lib/chatClient.js` for the website; keep the two identical.** |
| Website ↔ chat server | `lib/chatNotify.js` sends database notifications on channel `mg_chat` with types `membership`, `message_deleted` and `user_changed` |
| App and chat tokens | HS256, `lib/chatToken.js`, which mirrors `chat-server/src/token.js`. Claims are `sub`, `sv` (session version) and `kind`. |
| Pinstripe photo tokens | Signed with a key derived from `PINSTRIPE_MANAGEMENT_TOKEN`. `lib/pinstripeMedia.js` must match Pinstripe's `src/lib/mediaTokens.js`. |
| Private photo references | Stored as `pinstripe:<id>` in `User.profilePhotoUrl` and `profilePhotoOriginalUrl`. Show them with `photoSrc(ref, 'thumb' or 'medium' or 'display' or 'original')` from `lib/memberPhotoRef.js`. |
| Member data shown to other members | Only `lib/publicProfile.js` (`toPublicMember`). Never expose email, phone, consents or `profilePhotoUrl`. |
| Push | Chat pushes come from the chat server. Reminder and new-event pushes come from the website (`lib/expoPush.js`). |

**Tests:**
- `chat-server/`: `npm test` (7 tests).
- `mobile/`: `npm test` (3 end-to-end chat client tests against the hub).
- Both need a Postgres database with the migrations applied. The tests look for `PGHOST` or a socket at `/home/claude/.pgtest` on port 5433, database `mg`, and use `test/pgShim.js`.

**Previewing pages without a build:** I rendered pages by loading the real components with React's server renderer and Node loader hooks, compiling JSX with esbuild, using stubs for `next/link`, `prisma`, `next-auth` and the nav, then screenshotting with Playwright and `/usr/bin/google-chrome`. The scratch harness isn't in the repo, but it's quick to rebuild. One catch: CSS modules aren't renamed in that setup, so classes with the same name in two modules collide in previews only.

**Conventions:**
- **Design:** brand palette only: navy `#1c2837`, gold `#ffd460`, cream `#f7f4ed`, steel `#2d4059`.
  - Thelorin, an Art Deco capitals face, for headings; Inter for body text.
  - Photos first.
  - No all-caps labels, and no "→" on buttons.
  - UK English, sentence case.
- **Privacy:** gallery photos are for signed-in members only.
- **Commits:** end every commit message with the co-author and session lines.

**Suggested next steps:**
1. Get the website building on `claude/in-app-chat` with real dependencies (`npm run build`, `prisma validate`), then fix and merge up.
2. Get a development build of the app running, then fix any Expo API differences.
3. Phase 5: EAS production builds, TestFlight, Play internal testing, App Store privacy labels and screenshots, and a demo account for App Review.
4. Cleanup: the legacy columns and admin form fields, rate limiting on public uploads, and redesigning the dashboard and profile pages to match v2.
5. Use `ArrangementView` and `expo-hinge` for a proper Duo layout, such as the chat list and conversation side by side when unfolded.
