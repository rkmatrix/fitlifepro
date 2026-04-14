# FitLife — project context (implementation notes)

This file captures **what has been implemented** in this codebase session-by-session so future work (or another developer) can rely on one place for rationale, file locations, and caveats.

---

## 1. Web: Supabase auth storage (`window is not defined`)

### Problem

Running the app on **web** (`npm run web` / `expo start --web`) could crash with:

`ReferenceError: window is not defined`

Stack pointed at `@react-native-async-storage/async-storage` → Supabase Auth (`getItem` / session recovery). RN’s AsyncStorage assumes a browser `window`; during **SSR / Node** paths (e.g. Expo Router’s server render), `window` is missing.

### Solution

- **`lib/auth-storage.ts`** (new): Platform-specific storage for Supabase Auth.
  - **Native (iOS/Android):** `@react-native-async-storage/async-storage`.
  - **Web:** Custom adapter using **`localStorage`** only when `typeof window !== 'undefined'`; otherwise resolves no-op / `null` so Node/SSR does not touch `window`.
- **`lib/supabase.ts`:** `auth.storage` uses `authStorage` from `./auth-storage` instead of passing `AsyncStorage` on all platforms. Web keeps **`detectSessionInUrl: true`** and **`flowType: 'pkce'`**; native keeps implicit refresh with AsyncStorage.

### Git

Example commit message used: *Fix web: Supabase auth storage uses localStorage when window exists (no AsyncStorage SSR crash)*.

### Non-errors on web

- **`[expo-notifications] Listening to push token changes is not yet fully supported on web`** — informational; push token listeners are effectively no-ops on web.

---

## 2. App entry / routing

- **`app/index.tsx`:** Root `/` **redirects to `/(tabs)`** so the tab shell is the explicit entry; unauthenticated flow is handled inside the tab layout / onboarding as designed.

---

## 3. Security & auth (summary of broader work)

These items were part of the same overall effort; exact line-level history lives in git.

| Area | Intent |
|------|--------|
| **Auth token storage** | Prefer secure patterns on native (e.g. SecureStore where applicable); web uses browser storage appropriate to the surface (see §1 for Supabase’s adapter). |
| **Auth state** | Listener(s) for session changes and cross-device/session sync as needed by the app. |
| **OAuth / deep links** | Callback route(s) and deep linking aligned with Supabase + Expo Router (e.g. `auth/callback`). |
| **Input validation & keys** | Client-side validation; public keys via `EXPO_PUBLIC_*` in env — never commit secrets. |

---

## 4. Web hosting & headers

- **`DEPLOYMENT.md`:** Build (`npm run build:web` / `expo export --platform web`), copy **`public/.htaccess`** into **`dist/`**, Hostinger upload, Supabase URL config, Google OAuth origins/redirects.
- **`public/.htaccess`:** SPA rewrite to `index.html`, HTTPS redirect, security headers (e.g. `X-Frame-Options`, `X-Content-Type-Options`, Referrer-Policy), and related Apache rules for Hostinger.

---

## 5. Store / EAS metadata

- **`app.json`** and **`eas.json`** were updated for **App Store / Play** style metadata and EAS build profiles as part of release readiness (exact fields: see those files).

---

## 6. Known warnings (optional follow-ups)

When starting web, Metro may log **Expo Router layout warnings** such as missing nested route names (e.g. `workout/session/[id]`, `workout/[id]`). These are **separate** from the auth-storage fix; resolve by aligning `_layout` `Stack.Screen` names with actual files under `app/`.

---

## 7. Quick reference — important paths

| Path | Role |
|------|------|
| `lib/auth-storage.ts` | Supabase Auth storage adapter (web-safe + native AsyncStorage) |
| `lib/supabase.ts` | Supabase client + auth options |
| `constants/config.ts` | Public Supabase URL/key and related config |
| `app/index.tsx` | Root redirect to tabs |
| `app/auth/callback` | OAuth callback handling (Expo Router) |
| `public/.htaccess` | Production web headers + SPA routing |
| `DEPLOYMENT.md` | Web build and Hostinger deployment |

---

## 8. Environment

- Local secrets and overrides: **`.env`** (not committed). Use **`EXPO_PUBLIC_*`** for values required in the client bundle.

---

*Last updated: 2026-04-13 — aligns with web auth storage fix and related project structure.*
