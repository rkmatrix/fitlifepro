/**
 * Demo mode: provides mock data so the app can be fully explored
 * without a Supabase backend. Enable by setting EXPO_PUBLIC_DEMO_MODE=true
 * in your .env file.
 */

import { UserProfile, WorkoutLog, DailyNutrition, SleepLog, HealthMetrics, BodyMetrics } from '../types';
import { DEFAULT_CALORIE_TARGET, DEFAULT_PROTEIN_TARGET, DEFAULT_CARB_TARGET, DEFAULT_FAT_TARGET } from './config';
import { format, subDays } from 'date-fns';

export const IS_DEMO = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

export const DEMO_PROFILE: UserProfile = {
  id: 'demo-user-001',
  email: 'ramesh@fitlife.app',
  name: 'Ramesh Mathangi',
  age: 39,
  height_cm: 176,
  weight_kg: 81.6,
  goal_weight_kg: 72,
  target_calories: DEFAULT_CALORIE_TARGET,
  preferred_workout_time: '07:00',
  calendar_sync_enabled: false,
  health_sync_enabled: false,
  phase: 1,
  week_number: 3,
  created_at: new Date().toISOString(),
};

export const DEMO_TODAY_LOG: WorkoutLog = {
  id: 'demo-log-001',
  user_id: 'demo-user-001',
  date: format(new Date(), 'yyyy-MM-dd'),
  workout_day_id: 'p1_monday',
  status: 'done',
  variant: 'full',
  duration_min: 48,
  exercise_logs: [],
};

export const DEMO_NUTRITION: DailyNutrition = {
  date: format(new Date(), 'yyyy-MM-dd'),
  calories: 1740,
  protein: 138,
  carbs: 182,
  fat: 44,
  water_ml: 2250,
  target_calories: DEFAULT_CALORIE_TARGET,
  target_protein: DEFAULT_PROTEIN_TARGET,
  target_carbs: DEFAULT_CARB_TARGET,
  target_fat: DEFAULT_FAT_TARGET,
  entries: [],
};

export const DEMO_SLEEP: SleepLog = {
  id: 'demo-sleep-001',
  user_id: 'demo-user-001',
  date: format(new Date(), 'yyyy-MM-dd'),
  duration_min: 428, // 7h 8m
  sleep_score: 78,
  bedtime: new Date(Date.now() - 7.5 * 60 * 60 * 1000).toISOString(),
  wake_time: new Date().toISOString(),
  source: 'manual',
};

export const DEMO_HEALTH: HealthMetrics = {
  user_id: 'demo-user-001',
  date: format(new Date(), 'yyyy-MM-dd'),
  resting_hr: 62,
  steps: 6240,
  active_calories: 380,
  hrv: 48,
  source: 'demo',
};

export const DEMO_BODY_METRICS: BodyMetrics[] = Array.from({ length: 14 }, (_, i) => ({
  id: `demo-metric-${i}`,
  user_id: 'demo-user-001',
  date: format(subDays(new Date(), i * 2), 'yyyy-MM-dd'),
  weight_kg: 81.6 - (i * 0.15) + (Math.sin(i) * 0.3),
  waist_cm: 92 - (i * 0.1),
  bmi: 26.3 - (i * 0.05),
}));

export const DEMO_STREAK = 12;

export const DEMO_LOGS: WorkoutLog[] = Array.from({ length: 28 }, (_, i) => ({
  id: `demo-log-${i}`,
  user_id: 'demo-user-001',
  date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
  workout_day_id: 'p1_monday',
  status: i % 7 === 0 ? 'skipped' : i % 5 === 0 ? 'partial' : 'done',
  variant: 'full' as const,
  duration_min: 45 + Math.floor(Math.random() * 20),
  exercise_logs: [],
}));

export const DEMO_SLEEP_HISTORY: SleepLog[] = Array.from({ length: 14 }, (_, i) => ({
  id: `demo-sleep-${i}`,
  user_id: 'demo-user-001',
  date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
  duration_min: 390 + Math.floor(Math.random() * 90) - 45,
  sleep_score: 65 + Math.floor(Math.random() * 30),
  bedtime: new Date().toISOString(),
  wake_time: new Date().toISOString(),
  source: 'manual' as const,
}));
