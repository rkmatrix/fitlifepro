# FitLife — Web Build & Hostinger Deployment Guide

## 1. Build the web version

Run this from the project root:

```bash
npm run build:web
```

This runs `npx expo export --platform web` and outputs a static site to the `dist/` folder.

---

## 2. Copy the security `.htaccess`

After building, copy the `.htaccess` into the output:

```bash
# Windows PowerShell
Copy-Item "public/.htaccess" "dist/.htaccess"

# macOS / Linux
cp public/.htaccess dist/.htaccess
```

---

## 3. Upload to Hostinger

### Option A — File Manager (easiest)
1. Log into [Hostinger hPanel](https://hpanel.hostinger.com)
2. Go to **Files → File Manager**
3. Navigate to `public_html/` (or your domain's root folder)
4. Upload all files from your local `dist/` folder
5. Make sure `.htaccess` is uploaded (it may be hidden — enable "Show hidden files")

### Option B — FTP (recommended for large builds)
1. In hPanel → **Files → FTP Accounts**, get your FTP credentials
2. Use [FileZilla](https://filezilla-project.org/) to connect
3. Upload everything in `dist/` to `public_html/`

### Option C — Git deployment (advanced)
Hostinger supports Git auto-deploy for Business/Cloud plans:
1. hPanel → **Advanced → Git**
2. Set the repository URL and branch
3. Set the deploy path to `public_html/`
4. Every push to that branch triggers a deployment

---

## 4. Configure Supabase for your web domain

1. Go to [Supabase Dashboard](https://supabase.com) → your project → **Authentication → URL Configuration**
2. Set **Site URL** to `https://yourdomain.com`
3. Add these to **Redirect URLs**:
   ```
   https://yourdomain.com/auth/callback
   https://yourdomain.com/**
   ```

---

## 5. Configure Google OAuth (for Google sign-in)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Open your OAuth 2.0 Client ID
3. Add these **Authorized JavaScript origins**:
   ```
   https://yourdomain.com
   ```
4. Add these **Authorized redirect URIs**:
   ```
   https://[your-project].supabase.co/auth/v1/callback
   https://yourdomain.com/auth/callback
   ```
5. In Supabase Dashboard → **Authentication → Providers → Google**, enter the Client ID and Secret

---

## 6. Configure Facebook OAuth (for Facebook sign-in)

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Your App → **Facebook Login → Settings**
3. Add to **Valid OAuth Redirect URIs**:
   ```
   https://[your-project].supabase.co/auth/v1/callback
   ```
4. In Supabase Dashboard → **Authentication → Providers → Facebook**, enter the App ID and Secret

---

## 7. Test checklist after deploying

- [ ] `https://yourdomain.com` loads the app
- [ ] `https://yourdomain.com/some-route` serves `index.html` (SPA routing)
- [ ] HTTP redirects to HTTPS
- [ ] Google sign-in completes and redirects back to the app
- [ ] Facebook sign-in completes and redirects back to the app
- [ ] Email sign-up sends a confirmation email
- [ ] Data loads correctly (not demo mode)

---

## 8. Environment variables for production web build

Create a `.env.production` file (NOT committed to git):

```env
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
EXPO_PUBLIC_YOUTUBE_API_KEY=your-youtube-api-key
EXPO_PUBLIC_USDA_API_KEY=your-usda-api-key
```

Then build with:
```bash
# Load production env and build
node -e "require('dotenv').config({path:'.env.production'})" && npm run build:web
```

Or on PowerShell:
```powershell
# Set env vars then build
$env:EXPO_PUBLIC_DEMO_MODE="false"
$env:EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
npm run build:web
```

---

## 9. App Store Submission Guide

### Google Play Store
1. Build: `npm run build:android:prod` (creates AAB)
2. Download the `.aab` from [expo.dev](https://expo.dev)
3. Upload to [Google Play Console](https://play.google.com/console)
4. Fill in: app description, screenshots (5 minimum), privacy policy URL
5. Complete the Data Safety questionnaire
6. Submit for review (1–3 days)

### Apple App Store
**Requirements:**
- Mac computer with Xcode, OR
- EAS cloud build (already configured)
- Paid Apple Developer account ($99/year at [developer.apple.com](https://developer.apple.com))

**Steps:**
1. Enroll in Apple Developer Program
2. Update `eas.json` submit section with your Apple ID and App Store Connect app ID
3. Build: `npm run build:ios:prod`
4. Submit: `npm run submit:ios`
5. Fill in app metadata on [App Store Connect](https://appstoreconnect.apple.com)
6. Submit for review (1–7 days)

**Privacy Policy (required by both stores):**
You must host a privacy policy at a public URL before submission.
Minimum required sections:
- What data you collect (name, email, health metrics, food logs)
- How it's stored (Supabase, encrypted at rest)
- How to delete data (provide a delete account option)
- Third-party services used (Supabase, Google, OpenAI, YouTube)
