# Routing and navigation

## Router

**Expo Router** with **typed routes** (`experiments.typedRoutes` in `app.json`).

## Entry

- **`app/index.tsx`** — `Redirect` to `/(tabs)` so `/` always enters the tab shell.

## Root layout (`app/_layout.tsx`)

- Wraps app in `GestureHandlerRootView`, `SafeAreaProvider`, `StatusBar`.
- **`Stack`** screens (all `headerShown: false` unless noted):
  - `(tabs)` — main app
  - `onboarding/index`
  - `auth/callback`, `auth/reset-password`
  - `workout/session/[id]` — modal-style
  - `workout/[id]` — slide transition
- **Splash:** Comment documents **not** using `expo-splash-screen` manually here — Expo Router coordinates splash; extra hide/show can conflict on Android.

## Effects at root

1. **`loadProfile()`** from `userStore` on mount.
2. **`requestNotificationPermission()`** from accountability engine.
3. **`supabase.auth.onAuthStateChange`** (skipped if `IS_DEMO`):
   - `SIGNED_IN` → `loadProfile()`
   - `SIGNED_OUT` / `USER_DELETED` → `logout()` + `router.replace('/onboarding')`
   - `PASSWORD_RECOVERY` → `router.push('/auth/reset-password')`

## Tab layout (`app/(tabs)/_layout.tsx`)

- While **`isLoading`**: full-screen `ActivityIndicator`.
- If **`!isOnboarded`**: `<Redirect href="/onboarding" />`.
- Otherwise **`Tabs`** with: `index`, `workout`, `nutrition`, `health`, `progress`, `trainer`.

## Workout nested layout (`app/workout/_layout.tsx`)

- Inner **`Stack`**: `[id]`, `session/[id]`, `videos`.

### Layout warning note

If Metro logs *“No route named workout/session/[id]”* at the **root** `Stack`, it usually means the **parent** `Stack.Screen` names must match **file paths under `app/`**. The repo registers `workout/session/[id]` and `workout/[id]` on the root stack while **`app/workout/`** also has its own stack — verify Expo Router version conventions; align `Stack.Screen` `name` props with actual route files (see [09-troubleshooting](./09-troubleshooting.md)).

## Deep linking / scheme

- **`app.json`**: `scheme`: `fitlife`; iOS URL types; Android intent filters for `https://fitlife.app/auth/callback` and `fitlife://`.

## Auth callback route

See [04-authentication-and-state](./04-authentication-and-state.md) for `app/auth/callback.tsx` behavior.
