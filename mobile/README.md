# Manchester Gents app (iOS & Android)

Expo SDK 58, built with the iOS 27 SDK. Liquid Glass on iOS, resizable layouts
for the iPhone Duo (two columns when unfolded), native tabs.

**Phase 2** includes: sign-in, events (upcoming/past), RSVP and cancel, add to
calendar, event group chat (live, offline retry, typing, mute, announcements for
admins, report/block/delete), member profiles (events attended + Instagram chip,
no posts), your profile (avatar via Pinstripe, edit, sign out, delete account),
push notifications. DMs and the photo gallery arrive in phase 3.

## One-time setup

You need Node 22.13+ (or 24.3+), Xcode 27.1, and an Expo account.

```bash
cd mobile
cp .env.example .env            # set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_CHAT_URL
npm run setup                   # installs every package at the SDK 58 version
npx eas-cli@latest login
npx eas-cli@latest init         # creates the Expo project; copy the id into EAS_PROJECT_ID in .env
```

Push notifications:
- **iOS:** `npx eas-cli credentials` sets up the APNs key with your Apple Developer account.
- **Android:** create a Firebase project, add an Android app with package
  `com.manchestergents.app`, download `google-services.json` into `mobile/`, and
  upload the FCM key in `npx eas-cli credentials`.

## Running it on your iPhone

The app uses native modules (Liquid Glass, native tabs, notifications), so it
runs in a development build, not Expo Go.

```bash
npx expo run:ios --device       # builds with your local Xcode 27.1 and installs on the plugged-in phone
# or in the cloud:
npx eas-cli build --profile development --platform ios
```

Then `npm start` and open the dev build. Android: `npx expo run:android --device`.

## What the backend needs (phase 1 branch)

On the website (`claude/in-app-chat`), set `CHAT_TOKEN_SECRET` and
`CHAT_SERVER_URL`, run the Prisma migration, and start the chat server
(`chat-server/`, `docker compose up -d` on the home server). Pinstripe needs
the `claude/member-photos` branch for avatar uploads.

To test against a website running on your Mac: set `EXPO_PUBLIC_API_URL` to
`http://<your Mac's LAN IP>:3000` and `EXPO_PUBLIC_CHAT_URL` to
`ws://<LAN IP>:8080/ws`.

## Test checklist

- [ ] Sign in with an email or Instagram handle; wrong password shows an error
- [ ] Events tab: upcoming and past; pull to refresh; two columns with the Duo unfolded
- [ ] Event: reserve a spot (with and without a note), add to calendar, cancel
- [ ] After reserving: "Open event chat"; the chat appears in the Chats tab
- [ ] Chat: send, receive live from another account, typing indicator, scroll up for older messages
- [ ] Airplane mode: send a message, turn it off; it sends once
- [ ] Long-press: copy, view profile, report, block, delete (own; admin in event chats)
- [ ] Admin: megaphone toggle sends an announcement; muted members still get its push
- [ ] Mute bell in the chat header; unread badge on the Chats tab
- [ ] Push: lock the phone, send from another account, tap the notification → opens the chat
- [ ] Cancel your RSVP while the chat is open → you're taken out of the chat
- [ ] Member profile: events attended, member since, Instagram chip opens Instagram
- [ ] Profile: add/change/remove photo; edit name, Instagram and bio
- [ ] Delete account with your password (use a test account)
- [ ] An admin "log everyone out" on the website signs the app out too

## Tests

`npm test` runs the chat client against the real chat-server logic (needs the
local Postgres test database used by `chat-server` tests).
