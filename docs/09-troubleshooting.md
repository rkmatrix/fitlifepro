# Troubleshooting

## `ReferenceError: window is not defined` (Supabase / AsyncStorage)

**Cause:** `@react-native-async-storage/async-storage` used for Supabase session storage during web SSR/Node where `window` is missing.

**Fix:** Use `lib/auth-storage.ts` + `lib/supabase.ts` as documented in [04-authentication-and-state](./04-authentication-and-state.md).

## `[expo-notifications] Listening to push token changes is not yet fully supported on web`

**Meaning:** Informational. Push token listeners do not apply on web the same way; safe to ignore for web dev.

## Expo Router: “No route named …” for `workout/session/[id]` or `workout/[id]`

**Context:** Root `app/_layout.tsx` declares `Stack.Screen` entries for workout routes while `app/workout/_layout.tsx` also defines a nested stack.

**Direction:** Ensure screen `name` strings match Expo Router’s expected route names for your version; nested routes may need to be registered only in the **workout** layout, not duplicated on the root stack — verify against [Expo Router nested navigators](https://docs.expo.dev/router/advanced/nesting/) and adjust if warnings persist.

## Demo mode confusion

If data looks fake or auth never runs, check **`EXPO_PUBLIC_DEMO_MODE`**. Production builds should set it **`false`** in `eas.json` production profile.

## Missing Supabase env

`userStore` exits early without profile if URL/key empty — app shows onboarding/unauthenticated flow.

## Rate limits / 429 on APIs

Client has **`checkApiRateLimit`** / **`checkAuthRateLimit`** in `lib/security.ts` — server-side limits still apply (YouTube, Supabase, Edge Functions).

## OpenAI errors from Edge Functions

Confirm **`OPENAI_API_KEY`** is set in Supabase function secrets, not only locally.
