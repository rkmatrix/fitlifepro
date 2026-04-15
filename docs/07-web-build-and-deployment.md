# Web build and deployment

## Static export

- **`app.json`** → `web.output`: **`static`**
- Build: `npm run build:web` → `npx expo export --platform web` → output folder (typically **`dist/`**)

## Post-build: `.htaccess`

Copy **`public/.htaccess`** into the export root so Apache serves:

- **SPA fallback** — non-file routes → `index.html`
- **HTTPS** redirect
- **Security headers**

Commands are in **`DEPLOYMENT.md`** (PowerShell and bash).

## Hostinger (and similar)

Upload full contents of `dist/` to `public_html` (or equivalent). Ensure **hidden** `.htaccess` uploads.

## Supabase dashboard (web)

- **Site URL** — production domain
- **Redirect URLs** — include `https://yourdomain.com/auth/callback` and patterns your OAuth flow needs

## OAuth providers

**DEPLOYMENT.md** covers Google and Facebook redirect URIs and Supabase callback URL `https://[project].supabase.co/auth/v1/callback`.

## Production env for web

Use **`EXPO_PUBLIC_*`** vars at build time so they embed in the static bundle. Options:

- `.env.production` + load before build (see **DEPLOYMENT.md** §8)
- Or set shell environment variables then `npm run build:web`

## Testing after deploy

Checklist in **DEPLOYMENT.md** §7 — HTTPS, SPA routes, sign-in, data (non-demo).
