// Supabase configuration — anon key is designed to be public, protected by RLS
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// YouTube Data API v3 — used client-side for video search
// Restrict this key in Google Cloud Console to your app's bundle ID / domain
export const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';

// USDA FoodData Central — free API, low sensitivity
export const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY ?? 'DEMO_KEY';

// OpenAI — primary path is Supabase Edge Function (key stays server-side).
// EXPO_PUBLIC_OPENAI_API_KEY is a client-side fallback used when the Edge Function
// is not deployed; key is bundled in the APK (acceptable for a personal-use app).
export const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

// App
export const APP_NAME = 'FitLife';
export const APP_TAGLINE = 'Your 24/7 Personal Trainer';

// Fitness targets
export const DEFAULT_CALORIE_TARGET = 2200;
export const DEFAULT_PROTEIN_TARGET = 170; // grams
export const DEFAULT_CARB_TARGET = 210;
export const DEFAULT_FAT_TARGET = 60;
export const DAILY_STEP_TARGET = 8000;
export const DAILY_WATER_ML_TARGET = 3500;
export const SLEEP_TARGET_MIN = 420; // 7 hours
export const SLEEP_TARGET_MAX = 480; // 8 hours
