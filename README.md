# FitLife — Your 24/7 Personal Trainer

A full-stack React Native / Expo app that acts as your personal trainer, nutritionist, health monitor, sleep coach, and relentless accountability partner.

Built specifically for a 39-year-old South Indian male targeting visceral fat elimination and lean muscle gain in 6 months — but designed to be a **permanent lifestyle system**, not a temporary diet app.

---

## Features

### Fitness
- **6-Month Progressive Workout Plan** — 4 phases: Foundation → Building → Hypertrophy → Lifestyle Lock
- **Yoga, Zumba, and Meditation** fully integrated into the weekly plan
- **Active Session Tracker** — sets, reps, weight, rest timer, exercise queue
- **Smart Calendar Integration** — reads your calendar, detects meeting conflicts, auto-serves Express/Micro/Desk workout variants
- **Workout Status Logging** — Done / Partial / Skipped / Makeup
- **YouTube Video Library** — paste any YouTube URL, tag it, play in-app, use alongside posture AI
- **AI Posture Correction** *(architecture)* — TensorFlow.js MediaPipe BlazePose, 33 keypoints, on-device

### Nutrition
- **Food Diary** — breakfast, lunch, dinner, snacks with full macro tracking
- **USDA FoodData Central search** + **Open Food Facts barcode scan**
- **South Indian Meal Suggestions** — culturally-aware, protein-optimized recipes
- **Macro breakdown** — daily calorie, protein, carb, fat rings
- **Hydration tracker** — glass-by-glass water logging

### Health Monitoring
- **Sleep Monitor** — 14-day sleep score chart, correlation with workout performance
- **Vitals Dashboard** — resting HR, HRV, steps, active calories
- **Apple HealthKit + Google Health Connect** sync
- **AI-adaptive recommendations** based on sleep quality and HR data

### Intelligence
- **GPT-4o AI Trainer** — context-aware chat with full health data injected into every message
- **Smart Notification Engine** — state-driven, not just time-driven. Escalates based on whether workout has been done
- **Accountability Engine** — zero-escape. Soft nudge → express offer → evening reschedule → micro workout → compassionate wrap-up
- **Weekly Intelligence Report** — Supabase cron Sunday analysis: plan adjustments, plateau detection, recovery weeks
- **Streak Protection** — micro workout saves your streak on hard days
- **Adaptive Plan** — if you're ahead, intensity increases; if you're behind, volume reduces

### Progress
- **Body Metrics Log** — weight, waist, BMI trend charts
- **Workout Heatmap** — 16-week GitHub-style completion calendar
- **Phase Milestones** — visible progress markers at weeks 4, 8, 16, 24
- **Meditation Program** — 4 progressive techniques from Box Breathing to Open Awareness

---

## Setup

### 1. Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- Supabase account: [supabase.com](https://supabase.com)
- OpenAI API key (for AI trainer)
- YouTube Data API v3 key (optional, for video titles/thumbnails)

### 2. Clone and Install
```bash
cd c:/Projects/fitness
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Fill in your Supabase URL, anon key, OpenAI key, YouTube key
```

### 4. Set Up Supabase
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run: `supabase/migrations/001_initial_schema.sql`
3. Deploy Edge Functions:
   ```bash
   npx supabase functions deploy ai-trainer
   npx supabase functions deploy weekly-report
   ```
4. Add `OPENAI_API_KEY` to your Supabase Edge Function secrets

### 5. Run the App
```bash
# Development
npx expo start

# Android
npx expo start --android

# iOS (macOS required)
npx expo start --ios
```

---

## Project Structure

```
fitness/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Main tab navigation
│   │   ├── index.tsx       # Today / Command Center
│   │   ├── workout.tsx     # Training plan + calendar
│   │   ├── nutrition.tsx   # Food diary + meal suggestions
│   │   ├── health.tsx      # Sleep + vitals monitor
│   │   ├── progress.tsx    # Charts + milestones
│   │   └── trainer.tsx     # AI coach + meditation
│   ├── workout/
│   │   ├── [id].tsx        # Exercise detail
│   │   ├── videos.tsx      # YouTube video library
│   │   └── session/[id].tsx # Active workout session
│   └── onboarding/index.tsx
├── components/shared/      # Ring, Card, Button, Badges
├── constants/
│   ├── theme.ts            # Colors, fonts, spacing
│   ├── config.ts           # API keys, fitness targets
│   └── workoutPlan.ts      # Full 6-month plan data
├── engines/
│   ├── smartScheduler.ts   # Calendar conflict detection
│   ├── accountabilityEngine.ts # No-escape notifications
│   └── adaptivePlanEngine.ts   # Weekly AI adjustments
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── openai.ts           # GPT-4o trainer
│   ├── youtube.ts          # YouTube video utilities
│   ├── foodapi.ts          # USDA + Open Food Facts
│   └── calendar.ts         # Expo Calendar integration
├── stores/                 # Zustand state
│   ├── userStore.ts
│   ├── workoutStore.ts
│   ├── nutritionStore.ts
│   └── healthStore.ts
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── functions/
│       ├── ai-trainer/     # GPT-4o Edge Function
│       └── weekly-report/  # Sunday intelligence report
└── types/index.ts          # All TypeScript types
```

---

## The 6-Month Plan

| Phase | Weeks | Focus |
|-------|-------|-------|
| 1 | 1–4 | Foundation — form, re-conditioning, fat mobilization |
| 2 | 5–8 | Building — progressive overload, dumbbell introduction |
| 3 | 9–16 | Hypertrophy + HIIT — maximum muscle stimulus |
| 4 | 17–24 | Recomposition + Lifestyle Lock — deload, periodization |

**Weekly Schedule:**
- Monday: Upper Push (Chest/Shoulders/Triceps)
- Tuesday: Zumba + Core + Meditation
- Wednesday: Lower Body
- Thursday: Zone 2 Cardio / HIIT
- Friday: Upper Pull (Back/Biceps) + Core
- Saturday: Yoga + Meditation
- Sunday: Active Recovery + Meal Prep

---

## Trainer's Discipline Code

1. **Morning Ritual (15 min):** 500ml water, 5 min breathing, set intention
2. **Sleep by 10:30 PM:** No screens after 9:30 PM
3. **Sunday Meal Prep:** 3-day batch cook
4. **Protein with every meal**
5. **8,000 steps daily**
6. **3.5L water daily**
7. **Weekly weigh-in + measurements (Sunday AM)**

---

## Architecture Notes

- **Offline-first:** Workout plan and last-known data cached locally via Zustand
- **Privacy:** Posture AI runs 100% on-device (no video sent to cloud)
- **Notifications:** State-driven — fire based on what HAS and HAS NOT happened today
- **AI context:** Every GPT-4o message includes workout status, sleep score, nutrition data, HR, and streak
- **Calendar integration:** Reads device calendar (not cloud) via Expo Calendar API, no data leaves device
