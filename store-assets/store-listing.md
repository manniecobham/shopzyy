# Shopzyy: store listing for 1.2.1

Everything App Store Connect and Google Play Console ask for, in the order they ask for it. Copy each value into its field. Items in **[square brackets]** are for you to fill in.

## Release at a glance

| | iOS | Android |
|---|---|---|
| Version | 1.2.1 | 1.2.1 |
| Build | 16 | versionCode **14** (1.2.0 used 13, set in `app.config.ts`) |
| Bundle / package | `com.manniedev-team.shopzy` | `com.manniedevteam.shopzyy` |
| Minimum OS | iOS 16.4 | Android 7.0 (API 24), as set by the project |
| Price | Free, no in-app purchases | Free, no in-app purchases |
| Contains ads | No | No |

| Link | URL |
|---|---|
| Privacy policy | https://shopzyy.manniedev.com/privacy |
| Terms of use | https://shopzyy.manniedev.com/terms |
| Support | https://shopzyy.manniedev.com/support |
| Account deletion | https://shopzyy.manniedev.com/delete-account |
| Legal notice (Impressum) | https://shopzyy.manniedev.com/impressum |
| Open-source licences | https://shopzyy.manniedev.com/licenses |
| Marketing / website | https://shopzyy.manniedev.com |
| Download link (store redirect) | https://shopzyy.manniedev.com/download |
| Support email | support@manniedev.com |
| Developer / seller name | MannieDev Ltd, registered in Nigeria (RC 8411822), trading as MannieDev |
| Copyright line (iOS) | © 2026 MannieDev Ltd |

---

## Build and upload

### iOS (Xcode, no EAS)

1. In `app.config.ts`, check `version` and `ios.buildNumber`. Every upload needs a build number higher than the last one for the same version. App Store Connect refuses a version that is already approved, so a new release needs a new version (1.2.1 is the current one; 1.2.0 was uploaded before it).
2. `ios/` is generated from `app.config.ts`. Run `npm run prebuild:prod` before archiving so it carries version 1.2.1 and build 16 and the production Firebase files. It resets signing, so reselect your team under Signing & Capabilities afterwards, and check General shows Version 1.2.1 and Build 16.
3. Open `ios/Shopzyy.xcworkspace`. Destination: **Any iOS Device (arm64)**. Signing: Automatically manage signing, with your team.
4. **Product → Clean Build Folder**, then **Product → Archive**.
5. **Distribute App → App Store Connect → Upload**. Warnings about missing debug symbols for React and Expo frameworks are harmless.
6. Wait for the build to process in TestFlight. Test it, then attach it to the version in App Store Connect and **Add for Review**.

### Android (Android Studio, without EAS)

1. Run `npm install` so the menu patch is applied, then `npm run prebuild:prod`. `app.config.ts` sets `versionCode` to 13 and blocks the unwanted permissions, including `SYSTEM_ALERT_WINDOW`. Raise `versionCode` by one for each later upload.
2. Download the upload key once: `npx eas credentials`, then Android, production, credentials.json, **Download credentials from EAS to credentials.json**. This writes `credentials/android/keystore.jks` and `credentials.json` (both ignored by git). Move them to a safe place and back them up.
3. Open Android Studio **from a terminal**, so it finds Node:
   ```
   export ANDROID_HOME=~/Library/Android/sdk
   export JAVA_HOME=/opt/homebrew/opt/openjdk@17
   "/Applications/Android Studio.app/Contents/MacOS/studio" android
   ```
4. After Gradle syncs, choose **Build → Generate Signed App Bundle / APK → Android App Bundle**. Use the keystore, its password, the key alias and the key password from `credentials.json`, leave "Remember passwords" off, choose **release** and Create. The file is `android/app/release/app-release.aab`.
5. Check the upload key and permissions:
   ```
   keytool -printcert -jarfile android/app/release/app-release.aab | grep SHA1
   bundletool dump manifest --bundle=android/app/release/app-release.aab | grep uses-permission
   ```
   The SHA-1 must equal the upload key certificate on Play Console's App signing page (`8C:CB:D9:8C:73:01:3A:28:C2:61:C9:56:BC:47:DF:27:16:40:0C:57`).
4. In Play Console, update the store listing and App content first (see below).
5. **Testing → Internal testing → Create new release**, upload the `.aab`, paste the release notes, review and roll out. Install it from the test link on a real Android phone and try sign-in, the receipt scan, the menus, notifications and invite links.
6. Then **Production → Create new release → Add from library**. Use a staged rollout, for example 20%.

---

## App Store Connect (iOS)

### App information

| Field | Value | Limit |
|---|---|---|
| Name | `Shopzyy: Shared Shopping List` | 30 |
| Subtitle | `One list for your household` | 30 |
| Primary category | Lifestyle | |
| Secondary category | Productivity | |
| Content rights | Does not contain, show or access third-party content | |
| Age rating | 4+ (see answers below) | |

Terms of use say users must be 18 or older. That is a legal term, separate from the age rating. The rating stays 4+ because the app has no objectionable content.

### Age rating questionnaire

Answer **None / No** to every content question: cartoon or realistic violence, sexual content or nudity, profanity, horror, alcohol, tobacco or drugs, gambling, medical information, mature or suggestive themes, contests, and unrestricted web access. For user-generated content, select the answer that applies to private sharing only: lists are shared only with people the user invites, nothing is public, and there is no chat.

### Version information (1.2.1)

| Field | Value | Limit |
|---|---|---|
| Promotional text | `Add items in a sentence, tick them off at the shop and everyone sees it live. Scan your receipt to tick off your list and save the total.` | 170 |
| Keywords | `grocery,groceries,household,family,roommates,couples,receipt,scanner,restock,reminders,together` | 100 |
| Support URL | https://shopzyy.manniedev.com/support | |
| Marketing URL | https://shopzyy.manniedev.com | |
| Privacy policy URL | https://shopzyy.manniedev.com/privacy | |
| Copyright | © 2026 MannieDev Ltd | |
| Version release | Manually release after approval, then use a phased release | |

#### Description (4000 limit)

```
Shopzyy: hyping your shopping experience.

Shopzyy is the shared shopping list for everyone you live with. Add something on your phone and it's on everyone's list straight away. Tick it off at the shop and the whole household knows it's sorted. No more double-buying milk, and no more "did anyone get the bread?"

ONE LIST FOR THE WHOLE HOUSEHOLD
• Invite family or housemates with a link, a code or a QR code. They join in one tap.
• Everyone sees the same list, history and settings on all their devices.
• Belong to more than one household (home, the holiday house, the office) and switch in a tap.

ADD THINGS THE WAY YOU THINK
• Type "2 kg rice, milk x2, a dozen eggs" and Shopzyy turns it into three neat items with quantities and units.
• Items are sorted into store aisles automatically, so you can walk the shop in order.
• Re-add something you've bought before and Shopzyy remembers your usual amount.
• Smart autocomplete suggests the things your household buys most.

SCAN THE RECEIPT
• Photograph your receipt and see how it matches your list before you confirm. Matched items are ticked off and the total is saved.
• The photo is read on your phone and deleted straight away. It is never saved or uploaded.

IT LEARNS WHAT YOU BUY
• Shopzyy learns how often your household buys each item.
• "Probably running out", "Due about now" and "Not bought in a while" suggestions, each with a plain reason, like "Usually bought weekly, last bought 11 days ago".
• Restock reminders arrive in the morning on the day you're likely to run out, with an "Add to list" button that works right from the notification.

KNOW WHO'S GETTING WHAT
• Assign an item to someone so they know it's theirs to pick up. Anyone can still tick it off.
• Note who an item is for: a member of the household, or anyone else, like "the kids" or "Grandma".
• Group your list by aisle, room, who it's assigned to or who it's for, and drag the sections into the order you shop in.

SEE WHAT HAPPENED
• When someone goes shopping, everyone else gets one tidy summary, such as "Ada went shopping · 6 items · €42.30", instead of a ping for every item.
• The Activity feed shows who bought what and when, day by day, with the trip totals. Ticked something off by mistake? Swipe to undo, or just shake your phone.

MAKE IT YOURS
• Choose a mood for your household (Sunny, Calm, Cozy, Fresh, Party or Night) or use your own photo.
• Add your own categories and rooms, and pick a name, a colour and any emoji as your avatar.
• Available in English, Spanish, French, Dutch, German and Italian.
• Tell us what you'd like to see: send feedback from Settings.

PRIVATE BY DESIGN
• Sign in with Apple, Google or email.
• Your lists are stored in your account and shared only with the households you join.
• No ads and no tracking. Delete all your data from inside the app at any time.

Already used the original Shopzyy? Your households and history move over to your new account.

Made by MannieDev.
```

#### What's New (4000 limit)

```
• Choose any emoji as your avatar with the new emoji keypad.
• Send feedback and rate Shopzyy from Settings.
• Shopzyy now tells you when a new version is available.
• Smaller fixes and polish.
```

### App Review information

| Field | Value |
|---|---|
| Sign-in required | Yes |
| Demo account | **[DEMO EMAIL]** / **[DEMO PASSWORD]** |

Create the demo account before you submit. Install the app, tap **Continue with email**, sign up with a throwaway email and a password of 6 or more characters, choose a name and avatar, create a household called "Demo home", add a few items, and tick one off. Leave it in that state.

| Field | Value |
|---|---|
| Contact first / last name | **[NAME]** |
| Contact phone | **[PHONE, with country code]** |
| Contact email | support@manniedev.com |

Notes for the reviewer (paste into the Notes box):

```
Shopzyy is a shared household shopping list. There are no in-app purchases, no ads and no tracking.

Sign in: use the demo account above (tap "Continue with email"), tap "Continue with Apple", or create an account with any email address and a password of 6 or more characters. After signing in, choose a name and avatar, then create or join a household.

Main flows to try:
1. List tab: type "2 kg rice, milk x2, eggs" in the bar at the bottom. Three items are added. Tap an item's circle to tick it off. Swipe a row and tap Remove to delete it.
2. Receipt scan: on the List tab, tap the document icon at the right end of the add bar. Choose "Take photo" or "Choose from library". The text is read on the device with Apple's Vision framework. The photo is deleted after reading and never uploaded. The review sheet shows how each receipt line matches the list; tap Confirm to tick off the matched items and save the total.
3. Shake the phone to undo the last add or tick-off (a confirmation appears first).
4. Household tab: Invite people creates a link and a code. Notifications about someone finishing a shop need a second device in the same household.
5. Account deletion: Household tab > App settings > Delete my data (also available from the profile menu > Settings). It deletes the account and the data linked to it.
6. Feedback: Settings > Send feedback. Choose a type, write a message and tap Send. It is sent to us with the app version; the account is attached only if the contact switch is on.
7. Avatar: Settings > your profile. The emoji keypad only offers emoji; pick one and Save.

Permissions: camera (receipt scan), photo library (choose a receipt photo or a household background), notifications (shopping summaries and restock reminders), motion (shake to undo). All are optional and explained when requested.

People who used the original Shopzyy (version 1.0) have their households moved to their new account on first launch. A fresh install, as the reviewer will use, doesn't show that step.
```

### Export compliance

| Question | Answer |
|---|---|
| Uses encryption | Yes, only standard HTTPS and operating-system encryption |
| Qualifies for the exemption | Yes. The project already sets `ITSAppUsesNonExemptEncryption` to false, so the prompt is skipped for builds |

### App Privacy (nutrition labels)

**Do you or your third-party partners collect data from this app:** Yes. **Used for tracking:** No for every item.

| Data type | Linked to the user | Purpose |
|---|---|---|
| Contact info: email address | Yes | App functionality, account management |
| Contact info: name (the display name the user picks) | Yes | App functionality |
| User content: other user content (lists, items, shopping history, trip totals) | Yes | App functionality |
| User content: photos or videos (optional household background photo only) | Yes | App functionality |
| Identifiers: user ID | Yes | App functionality |
| Identifiers: device ID (push notification token) | Yes | App functionality |
| Usage data: other usage data (the last time the app was used) | Yes | App functionality |
| Diagnostics: other diagnostic data (anonymous error logs, no names, emails or list contents) | No | App functionality |
| User content: customer support (the optional feedback message; the account is attached only if the user asks to be contacted) | Yes | App functionality |

Not collected: location, contacts, health and fitness, financial info, browsing history, search history, purchases, sensitive info, advertising data. Receipt photos are read on the device and deleted, so they are not collected.

### Other declarations

| Item | Answer |
|---|---|
| Sign in with Apple | Offered, as required, alongside Google and email |
| Account deletion in the app | Yes, Household > App settings > Delete my data |
| IDFA / advertising identifier | Not used |
| Digital Services Act trader status | Complete it under Business in App Store Connect (individual or company, whichever applies) |
| Accessibility labels | Answer honestly for what you have tested |
| Supported devices | iPhone only (`supportsTablet` is off). The app also runs as "Designed for iPhone" on Mac and Apple Vision. Turn that off under Pricing and Availability if you don't want it |

### Screenshots

| Set | Size | Notes |
|---|---|---|
| iPhone, 6.1" or 6.3" slot | 1179 × 2556 or 1206 × 2622 (portrait) | Sizes shown on the App Store Connect upload screen. The poster boards are 1290 × 2796, so export them at 1206 × 2622. The sizes change over time, so trust the upload screen |
| App Preview (video) | 886 × 1920 portrait, or 1920 × 886 landscape | 15 to 30 seconds. Must be real footage of the app, with no other platforms shown. The animated ads do not qualify |
| iPad | Not needed | The app is iPhone only |

Five screenshots, in this order: One list, Type it, Live, Scan, Alerts. They come from the **Shopzyy Store Posters** canvas. App icon: `assets/icon.png` (1024 × 1024, no transparency, no rounded corners). Other images in `store-assets/ios/`.

### Permission texts (already in the app)

| Permission | Text shown to the user |
|---|---|
| Camera | Take a photo of a receipt to read it on your device. The photo is never saved or uploaded. |
| Photo library | Choose a photo of a receipt to read on your device, or a picture for your household. Receipt photos are never saved or uploaded. |
| Motion | Shopzyy uses motion sensing so you can shake your phone to undo the last change to your list. |

---

## Google Play Console (Android)

### Main store listing

| Field | Value | Limit |
|---|---|---|
| App name | `Shopzyy: Shared Shopping List` | 30 |
| Short description | `A shared shopping list for your household. Add, tick off and scan receipts.` | 80 |
| App category | Lifestyle (or Productivity) | |
| Tags | Lifestyle, Productivity, Shopping lists | |
| Email | support@manniedev.com | |
| Website | https://shopzyy.manniedev.com | |
| Privacy policy | https://shopzyy.manniedev.com/privacy | |

#### Full description (4000 limit)

Use the App Store description above with one change. Replace the line `• Sign in with Apple, Google or email.` with `• Sign in with Google or email.`

#### Graphics

| Asset | Size | File |
|---|---|---|
| App icon | 512 × 512 | `store-assets/android/icon-512.png` |
| Feature graphic | 1024 × 500 | `store-assets/android/feature-graphic-1024x500.png` |
| Phone screenshots | 2 to 8, each side 320 to 3840 px, long side at most twice the short side | Use the five poster boards. They are 1290 × 2796, which is taller than 2:1, so export them at 1080 × 1920 or 1080 × 2160 |
| Tablet screenshots | Optional | Not needed |
| Promo video | Optional | The 15-second ad can be linked if it is on YouTube |

### App content

| Section | Answer |
|---|---|
| Privacy policy | https://shopzyy.manniedev.com/privacy |
| Ads | The app does not contain ads |
| App access | Select **All or some functionality is restricted**, then **Add new instructions**. Use the name, username, password and text in the next section |
| Content rating | Complete the IARC questionnaire. Answer No to violence, sexual content, language, controlled substances and gambling. Answer Yes to "users can interact or share content" because household members see each other's lists. No location sharing, no purchases. Expect Everyone or PEGI 3 |
| Target audience | 18 and over, matching the terms of use. The app is not designed for children |
| Government app | No |
| Financial features | None. Trip totals are notes the user types, not payments |
| Health apps | My app does not have any health features. The step counter is not used and is removed from the build |
| News app | No |
| Advertising ID | The app does not use it. If a build shows `AD_ID` in its permissions, remove it or declare it |
| Data deletion | Yes. In the app and at https://shopzyy.manniedev.com/delete-account |

#### App access instructions (Play Console, App content, App access)

| Field | Value |
|---|---|
| Name | Reviewer account |
| Username | **[DEMO EMAIL]** |
| Password | **[DEMO PASSWORD]** |

Any other information, to paste:

```
Open the app and tap "Continue with email", then sign in with the details above (or use "Continue with Google"). The demo account already has a household called "Demo home" with a few items.

To try the main features: on the List tab type "2 kg rice, milk x2, eggs" in the bar at the bottom; tick an item off by tapping its circle; swipe a row and tap Remove to delete it; tap the document icon at the right end of the bar to scan a receipt (any photo of a shopping receipt works); open the Household tab to see Invite people and App settings. Account deletion is under Household > App settings > Delete my data.

Camera and notification permissions are optional.
```

### Data safety

**Does the app collect or share user data:** collects, does not share. **Is all data encrypted in transit:** Yes. **Can users ask for data to be deleted:** Yes, with the URL above.

| Data type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Personal info: name | Yes | No | No | App functionality, account management |
| Personal info: email address | Yes | No | No | App functionality, account management |
| Personal info: user IDs | Yes | No | No | App functionality, account management |
| Photos and videos: photos (optional household background) | Yes | No | Yes | App functionality |
| App activity: other user-generated content (lists, items, history, trip totals, optional feedback messages) | Yes | No | No | App functionality |
| App info and performance: diagnostics (anonymous error logs) | Yes | No | No | App functionality |
| Device or other IDs (push notification token) | Yes | No | No | App functionality |
| App activity: other actions (the last time the app was used) | Yes | No | No | App functionality |

Not collected: location, contacts, messages, audio, files and docs, calendar, health and fitness, financial info, web browsing. Google's Firebase processes the data on our behalf as a service provider, which Google's form does not count as sharing. Receipt photos stay on the device and are deleted.

### Permissions in the release bundle

| Permission | Why |
|---|---|
| `INTERNET` | Sync lists and sign in |
| `CAMERA` | Photograph a receipt |
| `POST_NOTIFICATIONS` | Shopping summaries and restock reminders |
| `VIBRATE` | Notification and haptic feedback |
| `RECEIVE_BOOT_COMPLETED` | Keep scheduled restock reminders after a restart |

None of these needs a special declaration form.

These must **not** appear in the bundle: `ACTIVITY_RECOGNITION`, `health.READ_STEPS`, `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `SYSTEM_ALERT_WINDOW`. The project blocks these in `app.config.ts`, except `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO`, which the app never requests. Check the real list after every build:

```
bundletool dump manifest --bundle=app-release.aab | grep uses-permission
```

### Release

| Field | Value |
|---|---|
| Release name | 1.2.1 |
| Countries | All, or your chosen list |
| Pricing | Free |

Upload key: sign with the same upload key you used before, which EAS stores. Download it with `npx eas credentials` as described above.

---

## Release notes in every language

App Store "What's New" and Google Play "Release notes" (Play allows 500 characters per language).

| Language | Text |
|---|---|
| English | • Choose any emoji as your avatar with the new emoji keypad.<br>• Send feedback and rate Shopzyy from Settings.<br>• Shopzyy now tells you when a new version is available.<br>• Smaller fixes and polish. |
| Español | • Elige cualquier emoji como avatar con el nuevo teclado de emojis.<br>• Envía comentarios y valora Shopzyy desde Ajustes.<br>• Shopzyy ahora te avisa cuando hay una versión nueva.<br>• Pequeñas correcciones y mejoras. |
| Français | • Choisissez n'importe quel emoji comme avatar avec le nouveau clavier d'emojis.<br>• Envoyez un avis et notez Shopzyy depuis les Réglages.<br>• Shopzyy vous prévient maintenant quand une nouvelle version est disponible.<br>• Petits correctifs et améliorations. |
| Nederlands | • Kies elke emoji als avatar met het nieuwe emoji-toetsenbord.<br>• Stuur feedback en beoordeel Shopzyy via Instellingen.<br>• Shopzyy meldt nu wanneer er een nieuwe versie is.<br>• Kleine verbeteringen en afwerking. |
| Deutsch | • Wähle mit der neuen Emoji-Tastatur ein beliebiges Emoji als Avatar.<br>• Sende Feedback und bewerte Shopzyy in den Einstellungen.<br>• Shopzyy meldet jetzt, wenn eine neue Version verfügbar ist.<br>• Kleine Korrekturen und Feinschliff. |
| Italiano | • Scegli qualsiasi emoji come avatar con la nuova tastiera emoji.<br>• Invia feedback e valuta Shopzyy dalle Impostazioni.<br>• Shopzyy ora ti avvisa quando è disponibile una nuova versione.<br>• Piccole correzioni e miglioramenti. |

### Google Play release notes, ready to paste

Play needs each language between its own tag. Paste this whole block into the release notes box. The text matches the App Store.

```
<en-US>
• Choose any emoji as your avatar with the new emoji keypad.
• Send feedback and rate Shopzyy from Settings.
• Shopzyy now tells you when a new version is available.
• Smaller fixes and polish.
</en-US>

<es-ES>
• Elige cualquier emoji como avatar con el nuevo teclado de emojis.
• Envía comentarios y valora Shopzyy desde Ajustes.
• Shopzyy ahora te avisa cuando hay una versión nueva.
• Pequeñas correcciones y mejoras.
</es-ES>

<fr-FR>
• Choisissez n'importe quel emoji comme avatar avec le nouveau clavier d'emojis.
• Envoyez un avis et notez Shopzyy depuis les Réglages.
• Shopzyy vous prévient maintenant quand une nouvelle version est disponible.
• Petits correctifs et améliorations.
</fr-FR>

<nl-NL>
• Kies elke emoji als avatar met het nieuwe emoji-toetsenbord.
• Stuur feedback en beoordeel Shopzyy via Instellingen.
• Shopzyy meldt nu wanneer er een nieuwe versie is.
• Kleine verbeteringen en afwerking.
</nl-NL>

<de-DE>
• Wähle mit der neuen Emoji-Tastatur ein beliebiges Emoji als Avatar.
• Sende Feedback und bewerte Shopzyy in den Einstellungen.
• Shopzyy meldet jetzt, wenn eine neue Version verfügbar ist.
• Kleine Korrekturen und Feinschliff.
</de-DE>

<it-IT>
• Scegli qualsiasi emoji come avatar con la nuova tastiera emoji.
• Invia feedback e valuta Shopzyy dalle Impostazioni.
• Shopzyy ora ti avvisa quando è disponibile una nuova versione.
• Piccole correzioni e miglioramenti.
</it-IT>
```

## Short fields in every language

The full English description is above. The other five languages need the description translated too. Ask for that when you want to add them. Until then the store shows the English description, and these short fields carry the translation.

| Language | Subtitle (30) | Promotional text (170) | Keywords (100) | Play short description (80) |
|---|---|---|---|---|
| English | • Choose any emoji as your avatar with the new emoji keypad.<br>• Send feedback and rate Shopzyy from Settings.<br>• Shopzyy now tells you when a new version is available.<br>• Smaller fixes and polish. |
| Español | • Elige cualquier emoji como avatar con el nuevo teclado de emojis.<br>• Envía comentarios y valora Shopzyy desde Ajustes.<br>• Shopzyy ahora te avisa cuando hay una versión nueva.<br>• Pequeñas correcciones y mejoras. |
| Français | • Choisissez n'importe quel emoji comme avatar avec le nouveau clavier d'emojis.<br>• Envoyez un avis et notez Shopzyy depuis les Réglages.<br>• Shopzyy vous prévient maintenant quand une nouvelle version est disponible.<br>• Petits correctifs et améliorations. |
| Nederlands | • Kies elke emoji als avatar met het nieuwe emoji-toetsenbord.<br>• Stuur feedback en beoordeel Shopzyy via Instellingen.<br>• Shopzyy meldt nu wanneer er een nieuwe versie is.<br>• Kleine verbeteringen en afwerking. |
| Deutsch | • Wähle mit der neuen Emoji-Tastatur ein beliebiges Emoji als Avatar.<br>• Sende Feedback und bewerte Shopzyy in den Einstellungen.<br>• Shopzyy meldet jetzt, wenn eine neue Version verfügbar ist.<br>• Kleine Korrekturen und Feinschliff. |
| Italiano | • Scegli qualsiasi emoji come avatar con la nuova tastiera emoji.<br>• Invia feedback e valuta Shopzyy dalle Impostazioni.<br>• Shopzyy ora ti avvisa quando è disponibile una nuova versione.<br>• Piccole correzioni e miglioramenti. |

---

## Before you submit

1. **Test the build** from TestFlight (iOS) or an internal track (Android), especially the receipt scan on real receipts, the invite link, Google sign-in and notifications.
2. **Receipt scanning claims.** If it doesn't read receipts well, remove the "Scan the receipt" section, the first What's New line and the receipt line in the short fields.
3. **Fill in the brackets:** demo account, review contact name and phone, trader status.
4. **Check the privacy answers** match the live privacy policy. If you ever add analytics, ads or a new data type, update both stores and the policy together.
5. **Check the pages are live:** open the privacy, terms, support and delete-account links from a phone.
6. **Android:** rebuild with `npm run prebuild:prod`, then confirm the permission list with `bundletool` as shown above.

## TestFlight checklist for 1.2.1

Use a real phone and the TestFlight build, with the functions, rules and hosting already deployed to production.

1. **Environment:** Settings shows the production app, not "Development build".
2. **Sign-in:** email, Google and Apple each work, with the Shopzyy logo and the consent note showing.
3. **Delete my data:** on a spare account that has joined a household on a second phone, delete it. Check the Firebase console shows no `users/…` record for it afterwards.
4. **Invite link:** share a link, open it on a second phone with the app installed, and see the household and inviter names in the preview. Joining adds the person to the Members screen.
5. **Install from an invite:** on a phone without the app, open the link, tap the store button, install, and use **Paste invite code** on the join screen.
6. **Join on a slow connection:** switch to a poor connection and join. The spinner changes to "Still syncing…" and a message appears if the household doesn't arrive.
7. **Receipt scan:** scan a real receipt, such as a long German one held in the hand. Check the items, store and total, and that no photo is saved.
8. **Lists:** change an item's category and see it update at once. Swipe an item to delete without marking it bought. Pick a household background photo without the app freezing.
9. **Notifications:** one trip alert per trip, with no repeats after reopening the app.
10. **Offline:** add items in airplane mode, reconnect, and confirm they reach the second phone.
11. **Languages:** change the language and check the new join and paste strings.
12. **Tour:** after updating from 1.1.2 the tour opens once on first launch, with Skip at the top. Settings → How Shopzyy works replays it with only Done.
13. **Join a household…** from the switcher menu and from a link, while already in a household.
14. **QR code:** Household → Invite people → Show QR code. Scan it with another phone's camera, with the app installed and not installed. The Shopzyy logo shows in the middle.
15. **Owner alert:** the owner's phone gets "X joined Y" when someone joins, tapping it opens the Household tab, and Settings → Notifications → New member alerts turns it off.
16. **Settings and Household pages:** the new groups, sub-pages and Back button work, Delete my data still works, and choosing a household photo from the Background sheet does not freeze.
17. **Older iPhones:** on an iPhone XS or similar, the add bar sits directly above the tab bar.
18. **Emoji keypad:** Settings → your profile. Pick an emoji from each tab, save, and check it shows on the List, Household and Activity screens and on a second phone.
19. **Feedback:** Settings → Send feedback. Send one with and one without the contact switch, and check both appear in the Firebase console under `feedback` (with the email only on the first).
20. **Update banner:** in Firestore `config/app`, set `latestVersionIos` to a version above the installed one. The banner shows on the List tab, Later hides it, and Settings shows "Update available". Remove the field afterwards.
21. **Rate Shopzyy:** the Settings row opens the App Store review page.
