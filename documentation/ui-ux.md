# UI & UX Walkthrough

## Global Elements
- **Navigation (`components/NavBar.js`):** Uses the horizontal Manchester Gents logo SVG (includes lettering) as the home link; links to Home, Events, Dashboard, Profile, Admin (if role=ADMIN). Logged-in members see their display name (respecting preferred-name privacy) on the Profile CTA.
- **Admin mode toggle:** Admins see a pill switch in the navbar (`ToggleAdminModeButton`) that stores preference in `localStorage`. Disabling it hides admin-only affordances (e.g., “Manage event” links, attendee thumbnails in consent views) for quick “member view” previews.
- **Footer (`components/Footer.js`):** Contact links, Instagram, privacy policy, copyright.
- **Brand Styling:** Headings use custom Thelorin font (loaded via `next/font/local` from `public/fonts/Thelorin.otf`) with contextual ligatures enabled so script connections remain intact; body text uses Inter (`next/font/google`). Palette defined in CSS variables (`app/globals.css`).

## Pages

### Home (`app/page.js`)
- **Hero banner:** Next event countdown (`HeroBanner + CountdownTimer`). If no upcoming events, displays CTA to register.
- **Upcoming experiences:** List of upcoming events via `EventCard`.
- **Community section:** Three value props with stylised copy.

### Events Index (`app/events/page.js`)
- Grid of published events (`EventCard`).
- Empty state glass panel if no events.

### Event Detail (`app/events/[slug]/page.js`)
- Event metadata, description, and palette preview cards.
- Guest list preview sorted with admins first, followed by members ordered by attendance history.
- RSVP CTA:
  - If not signed in → prompts login.
  - If already registered → shows confirmation + cancel button.
  - If not registered → “Reserve my spot” button with optional special request.
  - Locked when signup deadline has passed.
- Admins see a “Manage event →” link above the RSVP block that opens the dedicated event workspace.

### Dashboard (`app/dashboard/page.js`)
- Greeting with Instagram handle.
- Link to profile for managing consents.
- Sections:
  - “Your reservations” (current RSVPs).
  - “Recently announced” (events without a signup from the member).
- Uses `EventCard` for consistency.

### Profile (`app/profile/page.js`)
- `ProfileOverview` shows member snapshot cards (contact, name privacy, consent statuses, latest suited photo) so the page feels like a personal dashboard.
- “Edit profile & consents” CTA reveals `ProfileForm`, which still contains:
  1. **Personal details:** First/last name, optional preferred name (required when hiding first name), share-first-name toggle, phone, and private suited photo upload with an in-app circle cropper.
  2. **Terms & guidelines:** Interactive cards for each consent item (overview reduces this to a single “Agreed” status badge when everything is confirmed).
  3. **Photo preferences:** Yes/No pills for all media questions.
- Saving posts to `/api/profile`, refreshes the page, and collapses back to the overview with the updated timestamp from `consentUpdatedAt`.

### Authentication
- **Login (`app/login/page.js`):** Form for email/Instagram + password; card layout with CTA to register.
- **Register (`app/register/page.js`):** Extended form capturing first/last name, optional preferred name, private suited photo upload (with circular cropper), plus consent toggles. Mirrors profile form components for consistency.

### Admin (`app/admin/page.js`)
- Hero panel with quick access to the member directory and a “Create a new event” CTA.
- Responsive grid of event cards (status, schedule, description) each exposing a single “Manage event →” button that links to the event workspace.
- Admin-only, enforced via NextAuth session guard.

### Create Event (`app/admin/create-event/page.js`)
- Dedicated glass-panel page for spinning up new experiences using `AdminEventForm` without scrolling past existing events.

### Event Admin Workspace (`app/events/[slug]/admin/page.js`)
- Admin-only dashboard per event.
- Tabbed workspace keeps things desktop-friendly: “Event details”, “Guest list”, and “Community chat”.
- Event tab houses `AdminEventForm` for tuning copy, palette, timings, and capacity.
- Guest tab stacks `AdminAddToEventForm` (member/placeholder additions or table paste) with `EventAttendeeManager` (search + removal).
- Community tab surfaces `CommunityChatChecklist`, highlighting first-timers so admins can add them to the standing Instagram DM after each meetup.

### Member directory (`app/admin/members/page.js`)
- Table collapses to cards on mobile; each row links to the member detail view.
- Name column bundles handle, sharing preference, and placeholder badge.
- Consent column displays four gold-icon pills with white “Yes/No” labels for readability.
- Photos remain private to admins even though stored in Cloudinary.

### Member detail (`app/admin/members/[handle]/page.js`)
- Accessible by Instagram handle or user ID (fallback for members without Instagram).
- Desktop layout pins profile info while the right column shows consent history and the inline `AdminMemberEditor` (update contact, sharing prefs, placeholder status, consents, or remove member).

## Components of Interest
- **`EventSignupButton`:** Client component managing reservation state, special requests, cancellation confirmations, and error messaging.
- **`EventAdminWorkspace`:** Tabbed wrapper that switches between event settings, guest list tools, and the community chat checklist.
- **`CommunityChatChecklist`:** Admin-only helper that filters/sorts attendees, highlights first-timers, and offers quick copy buttons for Instagram handles when inviting members to the community chat.
- **`AuthForm`:** Two exports (RegisterForm, LoginForm) using shared `FormField`.
- **`ProfileOverview`:** Read-first experience summarising member data/consents and toggling the editor.
- **`ProfileForm`:** Mirrors registration layout but focuses on editing name privacy, private reference photo, and consent data.
- **`AdminEventForm`:** Uses color inputs, datetime selectors, handles creation and updates via fetch.

## UX Notes
- Glassmorphism aesthetic for panels to align with brand mood.
- Uppercase headings with tracking to reinforce premium feel.
- Buttons use gradients for primary actions and translucent backgrounds for secondary/danger states.
- States:
  - Disabled buttons utilise reduced opacity and `cursor: not-allowed`.
  - Error messages in red (`#ff9f9f`), success messages in mint (`#9affc7`).
- Mobile considerations:
  - Nav collapses stack.
  - Grid components use auto-fit patterns to adjust columns.
  - Admin/dashboard forms remain vertically stacked.

## Accessibility Considerations
- Buttons are actual `<button>` elements for keyboard support.
- Input labels wrap elements to ensure clickable associations.
- Modal RSVP overlay traps focus visually; if future changes add more modals, ensure focus management (currently simple due to single form).
- Colour contrast primarily high but review when adjusting palette.

## Future UI Enhancements
- Add toast notifications for profile save success.
- Provide RSVP confirmation emails or ICS files.
- Expand dashboard to show past events and quick links to profile.

## Documentation Guidance
- When altering UI flows (e.g., adding new steps, modals, or links), update this file.
- If PALETTE or component naming changes, reflect adjustments in architecture + data docs.
- Screenshots (once available) can be stored under `public/` and referenced here for visual guidance.***
