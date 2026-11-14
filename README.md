<div align="center">

<img src="assets/icon.png" alt="Shopzyy" width="112" height="112" style="border-radius: 25%">

# Shopzyy

**One shared shopping list for the whole household.**

Add items in a sentence, tick them off in the shop, and everyone in the household sees it live.

<sub>iOS · Android · Expo · React Native · Firebase</sub>

</div>

<br>

## Features

| | |
|---|---|
| 🏠 **Households** | Shared lists with invite links and codes. Belong to more than one. |
| ✍️ **Smart add** | Type `2 kg rice, milk x2, eggs`. Quantities, units and categories are worked out for you. |
| 🔔 **Running low** | Learns what you buy and suggests it, or reminds you, before you run out. |
| 🧾 **Trips and totals** | Ticked-off items become a shopping trip. Add the total and browse the history. |
| 📷 **Receipt scanning** | Scan a receipt, review how lines match your list, confirm. Read on the device, never stored. |
| ↩️ **Shake to undo** | Shake to take back the last add or tick-off. |
| 📲 **Notifications** | Get told when someone in your household has finished a shop. |
| 🌍 **Six languages** | English, Spanish, French, Dutch, German and Italian. |

## Built with

- **App:** Expo SDK 58, React Native 0.88, TypeScript, Expo Router
- **Look and feel:** native tabs, SF Symbols, iOS 26 Liquid Glass, native menus
- **Backend:** Firebase Auth (Apple, Google, email), Firestore, Cloud Functions, Hosting
- **Tests:** Jest

## Getting started

```bash
npm install
npm run prebuild      # generate the native projects (development)
npm run ios           # or: npm run android
```

Firebase config is not in the repo. Add your own files for each environment:

```
firebase/development/GoogleService-Info.plist
firebase/development/google-services.json
firebase/production/…            # same two files
```

`APP_ENV` picks the environment: `development` by default, `production` for store builds.

## Project layout

```
src/
  app/          routes (Expo Router)
  features/     list, activity, suggestions, household, account
  logic/        pure rules: parsing, trips, suggestions, receipts
  services/     business services and notifications
  data/         local store and Firestore sync
  i18n/         translations
modules/        local native modules (receipt reader, legacy import)
functions/      Cloud Functions: invites, trip alerts, migration
hosting/        invite and download pages
```

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Run the tests |
| `npm run lint` | Lint the code |
| `npm run release:ios` / `release:android` | Run a release build locally |
| `npm run deploy:dev` / `deploy:prod` | Deploy Firestore rules and functions |
| `npx eas-cli build --platform all --profile production` | Store builds |

## Privacy

Receipt photos are read on the device and deleted straight away. Only the items and total you confirm are saved. Reports sent from the app contain no names, list items or account details.

<br>

<div align="center"><sub>Made by MannieDev</sub></div>
