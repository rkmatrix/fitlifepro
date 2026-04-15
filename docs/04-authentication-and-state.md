# Authentication and app state

## Supabase client (`lib/supabase.ts`)

- Created with `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` from `constants/config.ts`.
- **Auth options:**
  - **`storage`:** `authStorage` from `lib/auth-storage.ts` (see below).
  - **`autoRefreshToken`:** true  
  - **`persistSession`:** true  
  - **`detectSessionInUrl`:** true on **web only** (OAuth/magic link fragments/query).
  - **`flowType: 'pkce'`** on **web only**; native uses implicit refresh with AsyncStorage-backed persistence.

## Auth storage (`lib/auth-storage.ts`)

Supabase requires a storage adapter that implements `getItem` / `setItem` / `removeItem` (async).

| Platform | Implementation |
|----------|----------------|
| **iOS / Android** | `@react-native-async-storage/async-storage` |
| **Web** | Custom adapter: **`localStorage`** when `typeof window !== 'undefined'`; otherwise no-op / `null` |

**Why:** RN AsyncStorage touches `window` and throws **`ReferenceError: window is not defined`** during SSR / Node (e.g. Expo Router server render). The web branch avoids that.

## Secure storage (`lib/secure-storage.ts`)

- Exports **`SecureStorageAdapter`** — **SecureStore** on native, **sessionStorage** on web (session-scoped, comment notes XSS/CSP tradeoffs).
- **Current wiring:** This adapter is **not** passed to `createClient` in `lib/supabase.ts`; the live client uses **`authStorage`** above. Keep this file if you later switch Supabase persistence to SecureStore or a dual strategy.

## User store (`stores/userStore.ts`)

Zustand store for profile and gating:

- **`loadProfile`:** If `IS_DEMO` → demo profile. If missing Supabase env → not onboarded. Else `getSession()` (with timeout), then `users` table `select` for `id`.
- **`logout`:** `signOut()` + clear local state.
- **`isOnboarded`:** Derived from loaded profile presence.

Timeouts protect against hanging network (e.g. `AUTH_TIMEOUT_MS`).

## OAuth / magic link callback (`app/auth/callback.tsx`)

- If URL has **`code`** (PKCE), calls `supabase.auth.exchangeCodeForSession(code)`.
- Then `getSession()`; on success `loadProfile()` and `router.replace('/(tabs)')`, else onboarding.

Web relies on **`detectSessionInUrl`** where applicable; native uses deep link query params.

## Password recovery

Root `onAuthStateChange` navigates to **`/auth/reset-password`** on `PASSWORD_RECOVERY`.
