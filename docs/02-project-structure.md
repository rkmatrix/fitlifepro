# Project structure

High-level map of the repository (not every file).

```
fitness/
├── app/                      # Expo Router screens
│   ├── _layout.tsx           # Root stack: auth listener, notification permission, screen registry
│   ├── index.tsx             # "/" → Redirect to /(tabs)
│   ├── (tabs)/               # Main tab shell (Today, Train, Fuel, Health, Stats, Coach)
│   ├── onboarding/           # Onboarding when not onboarded
│   ├── auth/
│   │   ├── callback.tsx      # OAuth / magic-link return
│   │   └── reset-password.tsx
│   └── workout/              # Nested stack: [id], session/[id], videos
├── components/shared/        # Reusable UI (Button, Card, VideoPlayer.*, etc.)
├── constants/                # config.ts, theme.ts, demo.ts, workoutPlan.ts
├── engines/                  # adaptivePlanEngine, smartScheduler, accountabilityEngine
├── lib/                      # supabase, auth-storage, secure-storage, security, APIs
├── stores/                   # Zustand: userStore, workoutStore, nutritionStore, healthStore
├── types/index.ts            # Shared TypeScript types
├── supabase/functions/       # Edge Functions (ai-trainer, weekly-report)
├── public/.htaccess          # Apache rules for deployed web (copy to dist/)
├── DEPLOYMENT.md             # Build + Hostinger + OAuth checklist
├── PROJECT_CONTEXT.md        # Short overview + link to docs/
└── docs/                     # This documentation set
```

## Engines

- **`adaptivePlanEngine.ts`** — plan adaptation logic
- **`smartScheduler.ts`** — scheduling
- **`accountabilityEngine.ts`** — nudges, notifications (`requestNotificationPermission` called from root layout)

## Constants

- **`constants/config.ts`** — `EXPO_PUBLIC_*` Supabase, YouTube, USDA; fitness defaults; note that **OpenAI is server-only** (Edge Functions), never `EXPO_PUBLIC_OPENAI`
- **`constants/demo.ts`** — `IS_DEMO` and mock profile/logs when `EXPO_PUBLIC_DEMO_MODE=true`

## Platform-specific components

Examples: `VideoPlayer.native.tsx` vs `VideoPlayer.web.tsx` — Metro resolves by platform.
