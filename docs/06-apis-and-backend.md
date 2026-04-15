# APIs and backend

## Client-side integrations (`lib/`)

| Module | Role |
|--------|------|
| `youtube.ts` | YouTube Data API v3 (search, etc.) — key from `EXPO_PUBLIC_YOUTUBE_API_KEY` |
| `foodapi.ts` | USDA / food lookups |
| `openai.ts` | Calls toward **Edge Functions** or server routes — **not** embedding secret keys in the bundle |
| `calendar.ts` | Calendar helpers |

## Supabase Edge Functions (`supabase/functions/`)

Deno deploy targets (deploy with Supabase CLI).

### `ai-trainer`

- Expects JSON body with `messages`.
- Reads **`OPENAI_API_KEY`** from Deno env.
- Calls OpenAI Chat Completions (`gpt-4o`), returns `{ reply }`.
- CORS headers for browser clients.

### `weekly-report`

- Uses **`SUPABASE_URL`**, **`SUPABASE_SERVICE_ROLE_KEY`**, **`OPENAI_API_KEY`**.
- Fetches users and weekly workout logs; generates short AI summaries (cron note in file: Sunday 3 PM).

**Secrets:** Set in Supabase project for functions — never in the Expo app.

## Database

- App uses Supabase **Postgres** via client (`from('users')`, etc.). **RLS** policies are assumed on the Supabase side; anon key is safe only with correct RLS.

## Realtime

- `lib/supabase.ts` sets `realtime.params.eventsPerSecond` — tune as needed.
