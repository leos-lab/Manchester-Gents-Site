# Before UAT: your to-do list

Work through these in order. A ✅ means it's already done. **Tell Claude** means send Claude the item in bold, and Claude does the rest.

---

## 1. Already done ✅

- ✅ uat.manchestergents.com: the UAT website on the UAT database, with real emails. All mail goes to uat@manchestergents.com.
- ✅ chat-uat.manchestergents.com: UAT chat on its own tunnel.
- ✅ Pinstripe `manchestergents-uat`: shows the live photos. Uploads stay in UAT and live photos can't be deleted from it.
- ✅ dev.manchestergents.com and chat-dev: the same setup for dev.
- ✅ Branches `dev` → `uat` → `main`.
- ✅ The UAT app build is set up: it's called "MCR Gents", has a UAT badge, and uses bundle id `com.manchestergents.app.uat`.

---

## 2. Check the UAT website (15 min)

1. Open https://uat.manchestergents.com and sign in with your normal email and password.
2. Send a chat message, and open the community chat.
3. On an existing event, upload a photo. It should show on UAT but **not** on manchestergents.com.
4. Request a password reset. The email should arrive at **uat@manchestergents.com**, with "[for your@email]" in the subject.
   - If nothing arrives, check that the uat@ mailbox exists and that the email account the site sends from (its SMTP login) is allowed to send to it.
5. Make a list of anything that looks wrong and send it to Claude.

> Testers sign in with their real email and password, because UAT is a copy of live. Reset emails go to uat@, not to the tester. If a tester is locked out, send them an admin reset link from the admin member page.

---

## 3. Expo / EAS (5 min)

The cloud service that builds the apps.

1. In the terminal, run `! npx eas-cli login` with your Expo account. Make a free account at expo.dev if you don't have one.
2. **Tell Claude:** "EAS is logged in". Claude then:
   - creates the Expo project
   - fills in `EAS_PROJECT_ID` in `mobile/.env`, which is still empty
   - links the project

> Push notifications from the website already use an Expo access token. It must belong to the **same Expo account** as the project, or pushes won't reach the UAT app.

---

## 4. Apple: TestFlight for iPhone

### What you need

| Item | Where | Notes |
|---|---|---|
| Apple Developer Program membership (£79/yr) | developer.apple.com → Account | Team ID `MS98FXR8TX` is already set. Check the membership is active and you've accepted the latest agreements. |
| Access to App Store Connect | appstoreconnect.apple.com | Use the Account Holder or an Admin login. |
| An App Store Connect API key (recommended) | App Store Connect → Users and Access → Integrations → App Store Connect API → **+** | Role: **App Manager**. Download the `.p8` file (you can only download it once) and note the **Issuer ID** and **Key ID**. It lets builds and uploads run without your Apple password and 2FA prompts. |

### Steps

1. **Create the app record:** App Store Connect → Apps → **+** → New App.
   - Platform: iOS
   - Name: **MCR Gents UAT**. The store name must be unique and is never seen on phones: the home screen still says "MCR Gents".
   - Primary language: English (UK)
   - Bundle ID: `com.manchestergents.app.uat`. If it isn't in the list, tell Claude and EAS will register it.
   - SKU: `mcrgents-uat`
   - User access: Full access
2. Give Claude the API key: put the `.p8` file somewhere on your Mac, and **tell Claude:** the file path, the Issuer ID and the Key ID.
3. Claude runs the UAT build, and EAS creates the signing certificate and the **push notification key** for you. Answer **yes** if asked to generate credentials.
4. Claude uploads the build to TestFlight. Apple takes 10 to 30 minutes to process it.
5. **Internal testing** (up to 100 people, no Apple review): TestFlight tab → Internal Testing → **+** → add testers. They must first be added as users in App Store Connect (Users and Access).
6. **External testing** (members, up to 10,000, needs a short Beta App Review of about a day): TestFlight → External Testing → **+** group. Apple asks for:
   - **Test information**: what to test, and a feedback email (uat@manchestergents.com).
   - **Beta App Review sign-in details**: a working UAT account and password, so Apple can sign in. Use a test member account, not yours.
   - **Privacy policy URL**: https://uat.manchestergents.com/privacy
   - Then turn on the **Public Link**.
7. Paste the TestFlight public link into the UAT site: sign in as admin → turn on admin mode → home page → **Edit** on the app buttons → iPhone link. The "Download for iPhone" button then appears.

### Your decision

- **Universal links:** the app currently claims `manchestergents.com` links, which open in the store app. Should the UAT app open `uat.manchestergents.com` links instead? Claude would also need to publish the link file (apple-app-site-association) on the UAT site.

---

## 5. Google: testing for Android

### What you need

| Item | Where | Notes |
|---|---|---|
| Google Play developer account ($25 once) | play.google.com/console | Identity check can take a few days. **Organisation** accounts (they need a D-U-N-S number) skip the rule below. |
| ⚠️ New **personal** accounts only | Play Console | To publish publicly later, you need a closed test with **at least 12 testers for 14 days in a row**. Starting UAT testing early counts towards this. |
| A Firebase project | console.firebase.google.com | Free. Used for Android push notifications. |
| A Google Cloud service account key (JSON) | See step 6 | Lets Claude upload builds without you. |

### Steps

1. **Firebase:** create a project, e.g. "MCR Gents". Then **Add app → Android** with package `com.manchestergents.app.uat`. Do the same for `com.manchestergents.app.dev` and `com.manchestergents.app` so all three are ready.
2. Download **google-services.json**. It covers every app in the project. Put it in `mobile/google-services.json` and **tell Claude**.
3. **Firebase push key:** Project settings → Service accounts → **Generate new private key**. **Tell Claude** where you saved the file; Claude adds it to EAS so Android pushes work.
4. **Play Console → Create app:**
   - Name: **MCR Gents UAT**
   - Language: English (UK)
   - App, Free
   - Accept the declarations
5. **Required forms**, on the app's Dashboard under "Set up your app":
   - Privacy policy: https://uat.manchestergents.com/privacy
   - App access: "All or some functionality is restricted", with a test account email and password.
   - Ads: No
   - Content rating questionnaire: a social / community app with user chat. Answer honestly about user interaction.
   - Target audience: **18+ only**
   - Data safety: you collect name, email, photos, approximate location (only when shared in chat) and messages. Data is encrypted in transit and users can ask for deletion. Claude can draft the answers if you want.
   - Government app / financial features / health: No
6. **Upload key, so Claude can upload builds:**
   - Google Cloud console → in the same project → IAM → Service Accounts → create one → Keys → Add key → JSON.
   - Then Play Console → **Users and permissions** → invite that service account's email with the **Release** permissions for this app.
   - **Tell Claude** where the JSON file is.
7. Claude runs the Android UAT build. **The first build must be uploaded by hand**: Claude will hand you the `.aab` file. Upload it in Testing → **Internal testing** → Create release. After that, Claude uploads builds automatically.
8. **Testers:** Internal testing → Testers → create an email list (up to 100) → copy the **opt-in link**.
   - For the 12-tester / 14-day rule, use **Closed testing** with at least 12 people who actually install the app.
9. Paste the opt-in link into the UAT site's admin **Edit** on the app buttons → Android link.

---

## 6. Before members test

- [ ] Decide who tests first: just you and admins, or some members.
- [ ] Write 3 to 5 lines for testers: what to try and how to report problems.
- [ ] Tell testers that UAT is a **copy**: anything they do there (messages, RSVPs, uploads) never reaches the real site, and emails don't reach them.
- [ ] Check https://uat.manchestergents.com/privacy and /guidelines read correctly. Apple and Google both link to the privacy page.

---

## 7. After UAT, before prod (later)

Not needed now, but on the list:

- Prod chat server at chat.manchestergents.com (address kept free for it).
- Prod app records: "MCR Gents" in the App Store and Google Play.
- Merge `uat` into `main`, run the database migrations on prod (Claude never does this without you), and deploy `mg-new`.
- Swap the home page's app buttons to the real App Store and Google Play links.
