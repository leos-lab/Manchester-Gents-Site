# Manchester Gents 2027 roadmap

Each phase is its own branch, built on the one before, so it can be tested on its own.

| Phase | Branch | Status |
|-------|--------|--------|
| 1. Backend: in-app chat + DMs, app API, photos on Pinstripe | `claude/in-app-chat` (+ Pinstripe-API `claude/member-photos`) | Ready to test |
| 2. App first version: sign-in, events, RSVP, event chat, profiles, push | `claude/phase-2-app` | Ready to test |
| 3. App: DMs, photo galleries, admin moderation, RSVP reminders via push | `claude/phase-3` | Ready to test |
| 4. Website v2: redesign + chat, DMs, gallery and profiles on the web; retire Instagram automation | — | Next |
| 5. TestFlight / Play testing, launch for the first 2027 event | — | |

## Notes for later phases

- **Website v2 (phase 4):** far more image-led than today: event cover photos,
  gallery highlights and member avatars throughout, not mostly text.
- **suited.social:** will link to Manchester Gents as another client of the
  versioned `/api/v1` and the chat protocol (account linking), so keep both
  backwards compatible.
- RSVP reminders now go by push to members with the app (phase 3) and fall back
  to an Instagram DM for everyone else. The welcome DM on registration still uses
  Instagram (new members don't have the app yet). Retire `lib/instagramAutomation.js`
  in phase 4 once the website sends email/push instead.
- The existing `/api/profile/photo` route accepts uploads without signing in
  (needed for registration); consider rate limiting in phase 4.
