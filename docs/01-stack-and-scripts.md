# Stack and scripts

## Product

**FitLife** — Expo/React Native app (iOS, Android, web) with Supabase backend, AI-assisted coaching, nutrition, health metrics, and workout flows.

## Core stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK ~54, **expo-router** (file-based routing) |
| UI | React 19, React Native 0.81, react-native-web (web) |
| State | Zustand (`stores/`) |
| Backend | Supabase (Auth, Postgres, Realtime); Edge Functions (Deno) |
| Styling | React Native `StyleSheet`, shared `constants/theme.ts` |

## Notable libraries

- **@supabase/supabase-js** — client
- **@react-native-async-storage/async-storage** — used for Supabase **auth storage on native only** (see [04-authentication-and-state](./04-authentication-and-state.md))
- **expo-secure-store** — available via `lib/secure-storage.ts` (adapter not wired into `createClient` in current code; documented there)
- **expo-notifications**, **expo-calendar**, **expo-camera**, **react-native-health-connect** — platform features
- **victory-native** — charts; **date-fns** — dates

## NPM scripts (from `package.json`)

| Script | Purpose |
|--------|---------|
| `npm start` | `expo start` |
| `npm run web` | `expo start --web` |
| `npm run android` / `ios` | `expo run:android` / `run:ios` |
| `npm run build:web` | `npx expo export --platform web` → static `dist/` |
| `npm run build:android:preview` | EAS Android preview APK |
| `npm run build:android:prod` | EAS Android production AAB |
| `npm run build:ios:prod` | EAS iOS production |
| `npm run submit:android` / `submit:ios` | EAS Submit |

## App config

- **`app.json`** — name, slug, version, iOS bundle ID, Android package, plugins, web meta, EAS `projectId`
- **`eas.json`** — build profiles (`development`, `preview`, `production`) and submit placeholders
- **`tsconfig.json`** — TypeScript; **typedRoutes** experiment enabled in `app.json`
