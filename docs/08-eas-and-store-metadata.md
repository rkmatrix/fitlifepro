# EAS and store metadata

## `eas.json`

| Profile | Use |
|---------|-----|
| **development** | Dev client, internal, `EXPO_PUBLIC_DEMO_MODE=true` |
| **preview** | Internal APK/simulator flags, demo mode |
| **production** | Store distribution, AAB (Android), `EXPO_PUBLIC_DEMO_MODE=false` |

**Submit (`submit.production`):**

- Android: `google-service-account.json` path, track, draft status — **configure for your Play account**
- iOS: `appleId`, `ascAppId`, `appleTeamId` — **replace placeholders** before real submission

Scripts: `build:android:prod`, `build:ios:prod`, `submit:android`, `submit:ios`.

## `app.json` (Expo)

- **Identity:** `name`, `slug`, `version`, `runtimeVersion`
- **iOS:** `bundleIdentifier` `com.fitlife.app`, `buildNumber`, usage descriptions (camera, calendar, health, Face ID), `associatedDomains`
- **Android:** `package`, `versionCode`, adaptive icon, edge-to-edge, intent filters for **https** auth callback and **fitlife** scheme, Health Connect–style permissions list
- **Web:** `meta` title, description, theme color, viewport
- **Plugins:** build properties (min SDK 26, compile/target 35, iOS 15.1), expo-router, fonts, secure-store, camera, calendar, notifications, local-auth

## Privacy and legal

Store submissions require a **hosted privacy policy URL** — outline in **DEPLOYMENT.md** §9.

## Version bumps

Increment **`version`** / **`runtimeVersion`**, iOS **`buildNumber`**, Android **`versionCode`** when shipping new store builds.
