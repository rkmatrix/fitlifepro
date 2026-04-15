# FitLife — project context (entry point)

**Full documentation lives in [`docs/`](./docs/README.md)** — split into topic files (stack, structure, routing, auth, security, APIs, web deploy, EAS, troubleshooting).

This file is a **short** historical summary; prefer **`docs/`** for completeness.

---

## Web: Supabase auth and `window`

Running **web** used to crash with `ReferenceError: window is not defined` because AsyncStorage (used for Supabase session) touches `window` during SSR/Node.

- **`lib/auth-storage.ts`** — AsyncStorage on native; on web, `localStorage` only when `window` exists.
- **`lib/supabase.ts`** — uses `authStorage`; web: `detectSessionInUrl`, `pkce`.

## Root app behavior

- **`app/index.tsx`** — redirects `/` → `/(tabs)`.
- **`app/_layout.tsx`** — `loadProfile`, notifications permission, `onAuthStateChange` (sign-out → onboarding; password recovery → reset route). **No** manual `expo-splash-screen` here (Expo Router owns splash).

## Other pointers

| Topic | Where |
|--------|--------|
| Step-by-step Hostinger + env + OAuth | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| Apache SPA + headers | [`public/.htaccess`](./public/.htaccess) |
| Topic index | [`docs/README.md`](./docs/README.md) |

## Environment

- **`.env`** — not committed; use **`EXPO_PUBLIC_*`** for client-visible config.

---

*Last updated: 2026-04-13 — docs folder added for full context.*
