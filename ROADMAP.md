# Manchester Gents 2027 roadmap

Each phase is its own branch, built on the one before, so it can be tested on its own.

| Phase | Branch | Status |
|-------|--------|--------|
| 1. Backend: in-app chat + DMs, app API, photos on Pinstripe | `claude/in-app-chat` (+ Pinstripe-API `claude/member-photos`) | Ready to test |
| 2. App first version: sign-in, events, RSVP, event chat, profiles, push | `claude/phase-2-app` | Ready to test |
| 3. App: DMs, photo galleries, admin moderation, RSVP reminders via push | `claude/phase-3` | Ready to test |
| 4. Website v2: redesign + chat, DMs, gallery and profiles on the web; retire Instagram automation | `claude/phase-4-website` | Ready to test |
| 5. TestFlight / Play testing, launch for the first 2027 event | — | Next |

## Notes for later phases

- **Website v2 (phase 4):** far more image-led than today: event cover photos,
  gallery highlights and member avatars throughout, not mostly text.
- **suited.social:** will link to Manchester Gents as another client of the
  versioned `/api/v1` and the chat protocol (account linking), so keep both
  backwards compatible.
- Instagram automation is retired (phase 4): welcome and RSVP reminders go by email, or push for app users.
- The existing `/api/profile/photo` route accepts uploads without signing in
  (needed for registration); consider rate limiting in phase 4.
