# Security and environment

## Client vs server secrets

| Kind | Where |
|------|--------|
| Supabase URL + **anon** key | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — public; RLS protects data |
| YouTube Data API key | `EXPO_PUBLIC_YOUTUBE_API_KEY` — restrict in Google Cloud to bundle ID / domain |
| USDA FoodData Central | `EXPO_PUBLIC_USDA_API_KEY` (can use `DEMO_KEY` for light use) |
| **OpenAI API key** | **Server-only** — Supabase Edge Function secrets (`OPENAI_API_KEY`). **Do not** add `EXPO_PUBLIC_` OpenAI keys |

See comments in `constants/config.ts`.

## `lib/security.ts`

Utilities used for safer client behavior:

- **Sanitization:** `sanitizeText`, `sanitizeNumber`
- **Validation:** `validateEmail`, `validatePassword`, `validateName`, `validateBodyMetrics`
- **Rate limiting:** In-memory `checkRateLimit`, `checkAuthRateLimit`, `checkApiRateLimit`
- **Logging:** `secureLog` — logs only in `__DEV__`
- **Redirects:** `validateRedirectUrl` with `ALLOWED_REDIRECT_HOSTS` — **update** `your-project.supabase.co` / hosts to match production

## Environment files

- **`.env`** — local development; **not committed**
- **`.env.production`** — optional for production web builds (see `DEPLOYMENT.md`)

Typical variables:

- `EXPO_PUBLIC_DEMO_MODE`
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_YOUTUBE_API_KEY`, `EXPO_PUBLIC_USDA_API_KEY`

## Demo mode (`constants/demo.ts`)

When `EXPO_PUBLIC_DEMO_MODE=true`:

- **`IS_DEMO`** is true — mock profile and data; auth listeners and Supabase calls are skipped or short-circuited where coded.

## Web headers (`public/.htaccess`)

Deployed to Apache (e.g. Hostinger): SPA rewrite, HTTPS, security headers (frame options, MIME sniffing, referrer policy, CSP-related sections as present in file). Copy into `dist/` after `expo export`. Details in [07-web-build-and-deployment](./07-web-build-and-deployment.md).
