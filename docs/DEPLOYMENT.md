# Shopzyy deployment guide

How to ship Shopzyy to the App Store and Google Play, and how to deploy the server. Every platform has two routes: **without EAS** (you build on your own Mac) and **with EAS** (Expo builds in the cloud). Pick one per release. The store form answers and release notes are in `store-assets/store-listing.md`.

## 0. The map

| | Development | Production |
|---|---|---|
| Firebase project | `shopzyy-8e62c` | `shopzyy-19bc2` |
| Link host | `shopzyy-8e62c.web.app` | `shopzyy.manniedev.com` |
| iOS bundle | `com.manniedev-team.shopzy` | same |
| Android package | `com.manniedevteam.shopzyy` | same |
| Environment variable | `APP_ENV=development` | `APP_ENV=production` |

Things to know:
- `ios/` and `android/` are generated from `app.config.ts` and are not in git. `prebuild` rewrites them.
- Firebase config files are not in git. They must exist at `firebase/development/` and `firebase/production/` (`GoogleService-Info.plist` and `google-services.json` in each).
- Signing keys never go in git. `credentials/` and `credentials.json` are ignored. Keep backups outside the project.

## 1. Before every release

1. `git status` is clean, or you know what is uncommitted.
2. `npm install` (this also applies the menu patch through `patch-package`).
3. `npx tsc --noEmit` and `npx jest` pass.
4. Set the version in `app.config.ts`:
   - `version` (for example `1.1.2`) is the number people see. A new release needs a new one. A version that is already approved cannot take another upload.
   - `ios.buildNumber` must be higher than the last upload for that version.
   - `android.versionCode` must be higher than any code ever uploaded to Play, even to a draft. If a bundle was uploaded, raise the number again.
5. Deploy the server **first** (section 2) when the app calls anything new.
6. Read `store-assets/store-listing.md` and update the release notes and the demo account.

## 2. Server: Firebase (rules, functions, hosting)

Use `--project development` to test first, `--project production` for real.

```
firebase login                                   # once
npm run deploy:prod                              # firestore rules + indexes, and functions
firebase deploy --project production --only hosting   # invite page, landing page, legal pages
```

You can deploy one part: `--only firestore:rules`, `--only functions`, `--only functions:joinHousehold`, `--only hosting`.

**After every functions deploy, run the check. This step matters:**

```
npm run check:functions        # production
npm run check:functions:dev    # development
```

Every line must say `ok`. A `FAIL ... answered 403` means Cloud Run is blocking that function, so the app shows "Sign in again" and nobody can join. Fix: Google Cloud Console → Cloud Run → the service (lower case, e.g. `joinhousehold`) → **Security** → **Allow public access** → Save. The code sets `invoker: 'public'`, but a deploy has failed to apply it before.

Server notes:
- Functions deploy runs `npm run build` in `functions/`, which also copies `hosting/join.html`.
- Deploy order when both change: rules and functions first, then hosting, then the app.
- Rolling back: check out the earlier commit and deploy again. There is no one-click rollback for rules.

## 3. iOS

### 3A. Without EAS (Xcode)

1. Prepare the project:
   ```
   npm run prebuild:prod
   ```
   Wait for it to finish. In Terminal, if pods complain: `cd ios && pod install`.
2. Open `ios/Shopzyy.xcworkspace` in Xcode (`xed ios`).
3. Click the **Shopzyy** target, then **Signing & Capabilities**: choose your team with **Automatically manage signing**. Keep Sign in with Apple and Push Notifications.
4. **General** tab: Version must equal `version` in `app.config.ts` and Build must equal `buildNumber`. A prebuild can leave the build settings at 1.0 and 1. Fix them here, because a mismatch with `Info.plist` makes App Store Connect reject the upload.
5. Destination: **Any iOS Device (arm64)**. Then **Product → Clean Build Folder**, then **Product → Archive**.
6. If it stops with "Scanning for @ExpoModule classes didn't complete", it is a timeout. Build again, or run `npx expo-modules-autolinking resolve --platform apple > /dev/null` first.
7. In the Organizer: **Distribute App → App Store Connect → Upload**.
8. In App Store Connect: wait for processing, then test in **TestFlight** (checklist in `store-listing.md`). Create the new version, paste the release notes, select the build, answer export compliance (no non-exempt encryption), fill App Review information with the demo account, then **Add for Review**.

### 3B. With EAS

1. `npx eas login`, then check `eas.json`: the `production` profile sets `APP_ENV=production` and `autoIncrement`.
2. Firebase files: EAS builds from git, which does not hold the Firebase files. In expo.dev, open the project's **Environment variables**, choose the production environment and add file variables named `GOOGLE_SERVICES_PLIST` and `GOOGLE_SERVICES_JSON`. `app.config.ts` reads them.
3. Version numbers: `eas.json` uses `appVersionSource: remote`, so EAS keeps its own build counter and ignores `buildNumber` in `app.config.ts`. If the counter is behind App Store Connect, set it with `npx eas build:version:set -p ios`.
4. Build:
   ```
   npx eas build --platform ios --profile production
   ```
   The first time, EAS asks for your Apple login to create or reuse signing credentials.
5. Upload: `npx eas submit --platform ios --latest`. It needs your App Store Connect login or an API key.
6. Continue at step 8 of 3A (TestFlight, then submit for review).

## 4. Android

### 4A. Without EAS (Android Studio)

One-time setup:
- Android SDK from Android Studio (it is at `~/Library/Android/sdk`) and JDK 17 (`brew install openjdk@17`).
- Your upload key, saved outside the project: `npx eas credentials` → Android → production → credentials.json → **Download credentials from EAS to credentials.json**. This creates `credentials/android/keystore.jks` and `credentials.json` with the three passwords (keystore password, key alias, key password). Copy both to a safe place and back them up. Without this key, Play will refuse updates.

Every release:
1. Set `android.versionCode` in `app.config.ts`, then run `npm run prebuild:prod`. After a prebuild confirm `android/app/build.gradle` shows the same `versionCode`, and that `android/app/src/main/AndroidManifest.xml` blocks `SYSTEM_ALERT_WINDOW` and has the `screen.portrait` feature set to `required="false"` (both come from `app.config.ts` and its plugins).
2. Open Android Studio **from a terminal**, so it can find Node (nvm's Node is invisible to apps started from the Dock):
   ```
   export ANDROID_HOME=~/Library/Android/sdk
   export JAVA_HOME=/opt/homebrew/opt/openjdk@17
   "/Applications/Android Studio.app/Contents/MacOS/studio" android
   ```
   Wait for **Gradle sync** to finish (the first run takes several minutes). Ignore the pop-ups about upgrading plugins.
3. **Build → Generate Signed App Bundle / APK → Android App Bundle**. Key store path: `credentials/android/keystore.jks`. Enter the three passwords from `credentials.json`. Leave "Remember passwords" off. Choose **release**, then Create. The file is `android/app/release/app-release.aab`.
4. Check it before you upload:
   ```
   keytool -printcert -jarfile android/app/release/app-release.aab | grep SHA1
   ```
   It must equal the **upload key certificate** SHA-1 under Play Console → Test and release → App integrity → App signing (`8C:CB:D9:8C:73:01:3A:28:C2:61:C9:56:BC:47:DF:27:16:40:0C:57` at the time of writing).
   ```
   bundletool dump manifest --bundle=android/app/release/app-release.aab | grep uses-permission
   ```
   (`brew install bundletool`.) Expect only `INTERNET`, `CAMERA`, `POST_NOTIFICATIONS`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED` plus harmless badge and launcher ones. There must be no `SYSTEM_ALERT_WINDOW`, `ACTIVITY_RECOGNITION`, `RECORD_AUDIO` or storage permissions.
5. Upload (section 4C).

Do not use `npm run release:android`. It signs with the debug key, which Play rejects.

Command-line alternative: after the one-time setup, add a release signing config to `android/app/build.gradle` reading the key from `~/.gradle/gradle.properties`, then run `cd android && ./gradlew bundleRelease`. A prebuild overwrites that edit, so Android Studio's wizard is easier.

### 4B. With EAS

1. `npx eas login`. Check the production file variable `GOOGLE_SERVICES_JSON` exists in expo.dev (as in 3B step 2).
2. Build:
   ```
   npx eas build --platform android --profile production
   ```
   EAS signs with the stored upload key and raises `versionCode` itself (`autoIncrement`). Download the `.aab`.
3. If the cloud build fails on the Firebase file, build on your Mac with EAS tooling: `GOOGLE_SERVICES_JSON=$PWD/firebase/production/google-services.json npx eas build --platform android --profile production --local`.
4. Run the same checks as 4A step 4 on the downloaded `.aab`.
5. Upload (4C). `npx eas submit --platform android --latest` needs a Google service account key assigned in EAS. None is set up yet, so upload by hand.

### 4C. Upload to Google Play

1. Play Console → your app → **Test and release → Production → Create new release**.
2. Upload the `.aab`. It should show the right version code and name.
3. Release name: the version (for example `1.1.2`). Release notes: paste the tagged block from `store-assets/store-listing.md` (`<en-US> … </en-US>`, one tag per language).
4. **Next**, read the warnings, and start with a **staged rollout** (20%). For a riskier release, use Internal testing first.
5. **Publishing overview**: send changes for review. Check that App access holds your demo account, and answer any new declaration. Choose "No" for the China security and AI-content questions.

## 5. After release

- Install the store build on a real phone. Run the TestFlight checklist at the end of `store-listing.md`.
- Run `npm run check:functions` once more.
- Watch Play Console vitals (crashes, ANRs) and Firebase for errors. Raise the Android rollout if they stay clean.
- Apple review usually takes up to two days; Google can take several days for an update.
- **Halting:** Play Console → the release → **Halt rollout**. Apple has no rollback: you can remove the version from sale and submit a fix with an expedited review request.

## 6. Problems you may meet

| Symptom | Cause and fix |
|---|---|
| Upload says the version or build number is invalid | The Version or Build in Xcode does not match `Info.plist` or is not higher than the last upload. Set both in General (3A step 4) |
| Settings says "Development build" | The build used the development Firebase files. Run `npm run prebuild:prod` and check `firebase/production/` |
| "Scanning for @ExpoModule classes didn't complete" in Xcode | Timeout on the first build after a prebuild. Build again, or use the autolinking command in 3A step 6. Node LTS is safer than a very new Node |
| `RCTBridge.h` not found building the menu library | The patch did not apply. Run `npx patch-package` and `npm install` |
| Gradle sync: "Process 'command node' finished with non-zero exit value 1" | Android Studio was started from the Dock. Quit it and start it from a terminal (4A step 2) |
| Play: "Version code already used" | A bundle with that code was uploaded before. Raise `versionCode` and rebuild |
| Play: signing key mismatch | The bundle is signed with a different key. Check the SHA-1 in 4A step 4. Request an upload-key reset in Play Console if the key was lost |
| Play: hardware feature declarations restrict availability | The `screen.portrait` feature must be optional. It comes from `plugins/withOptionalPortrait.js`. Check the manifest after a prebuild |
| `SYSTEM_ALERT_WINDOW` in the bundle | It is in `blockedPermissions` in `app.config.ts`. After a prebuild confirm the manifest removes it |
| App says "Sign in again" when joining or leaving | A function is blocked at Cloud Run. Run `npm run check:functions` and apply the Cloud Run fix in section 2 |
| Prebuild reset my Xcode team or versions | Expected. Reselect the team and recheck Version and Build in Xcode |
| Android Gradle plugin or Protocol Buffers upgrade pop-ups | Ignore them. Upgrading can break the build |

## 7. Quick reference

```
npm run prebuild:prod                       # regenerate ios/ and android/ for production
npm run deploy:prod                         # rules and functions
firebase deploy --project production --only hosting
npm run check:functions                     # all lines must say ok

# iOS, no EAS      : Xcode → Archive → Distribute
# iOS, EAS         : npx eas build -p ios --profile production && npx eas submit -p ios --latest
# Android, no EAS  : Android Studio → Generate Signed App Bundle → upload the .aab
# Android, EAS     : npx eas build -p android --profile production
```
