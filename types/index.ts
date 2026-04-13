export type WorkoutStatus = 'done' | 'partial' | 'skipped' | 'makeup' | 'pending';
export type WorkoutVariant = 'full' | 'express' | 'micro' | 'desk';
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio' | 'yoga' | 'zumba' | 'meditation' | 'full_body';
export type VideoType = 'youtube' | 'local' | 'custom';
export type VideoTag = 'yoga' | 'zumba' | 'strength' | 'cardio' | 'meditation' | 'mobility' | 'hiit' | 'warmup' | 'cooldown';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodSource = 'USDA' | 'OpenFoodFacts' | 'custom';
export type PhaseNumber = 1 | 2 | 3 | 4;
export type SleepSource = 'healthkit' | 'healthconnect' | 'manual';
export type AccountabilityEventType = 'nudge' | 'redirect' | 'streak_save' | 'recovery_week' | 'milestone';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  goal_weight_kg: number;
  target_calories: number;
  preferred_workout_time: string; // "07:00"
  calendar_sync_enabled: boolean;
  health_sync_enabled: boolean;
  created_at: string;
  phase: PhaseNumber;
  week_number: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  description: string;
  instructions: string[];
  default_sets: number;
  default_reps: number;
  default_duration_sec?: number;
  rest_sec: number;
  video_url?: string;
  video_type?: VideoType;
  posture_support: boolean;
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface WorkoutDayExercise {
  exercise: Exercise;
  sets: number;
  reps: number;
  duration_sec?: number;
  rest_sec: number;
  notes?: string;
  order: number;
  // Phase-specific overrides
  phase_sets?: Partial<Record<PhaseNumber, number>>;
  phase_reps?: Partial<Record<PhaseNumber, number>>;
}

export interface WorkoutDay {
  id: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  name: string;
  focus: string;
  muscle_groups: MuscleGroup[];
  full_duration_min: number;
  express_duration_min: number;
  micro_duration_min: number;
  exercises: WorkoutDayExercise[];
  express_exercises: string[]; // exercise ids for express variant
  micro_exercises: string[]; // exercise ids for micro variant
  desk_exercises: string[]; // exercise ids for desk variant
  phase: PhaseNumber;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  date: string;
  workout_day_id: string;
  planned_start: string;
  actual_start?: string;
  planned_duration_min: number;
  actual_duration_min?: number;
  status: WorkoutStatus;
  variant: WorkoutVariant;
  calendar_conflict?: string;
  rescheduled_to?: string;
  notes?: string;
}

export interface ExerciseLog {
  exercise_id: string;
  sets_completed: number;
  reps_per_set: number[];
  weight_per_set: number[];
  duration_sec?: number;
  notes?: string;
  posture_score?: number; // 0-100
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  date: string;
  workout_day_id: string;
  status: WorkoutStatus;
  variant: WorkoutVariant;
  duration_min: number;
  exercise_logs: ExerciseLog[];
  notes?: string;
  posture_flags?: PostureFlag[];
  calories_burned?: number;
}

export interface PostureFlag {
  exercise_id: string;
  error_type: string;
  severity: 'low' | 'medium' | 'high';
  correction: string;
  count: number;
}

export interface CustomVideo {
  id: string;
  user_id: string;
  title: string;
  youtube_url: string;
  youtube_id: string;
  thumbnail: string;
  duration_sec?: number;
  channel_name?: string;
  tags: VideoTag[];
  added_at: string;
  last_watched?: string;
  watch_count: number;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  sodium_per_100g?: number;
  source: FoodSource;
  barcode?: string;
}

export interface FoodEntry {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  food_item: FoodItem;
  quantity_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
}

export interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water_ml: number;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  entries: FoodEntry[];
}

export interface MealSuggestion {
  name: string;
  meal_type: MealType;
  description: string;
  ingredients: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time_min: number;
  is_south_indian: boolean;
  tags: string[];
}

export interface BodyMetrics {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  waist_cm?: number;
  chest_cm?: number;
  hip_cm?: number;
  body_fat_pct?: number;
  bmi: number;
  notes?: string;
  photo_url?: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  date: string;
  duration_min: number;
  sleep_score: number; // 0-100
  bedtime: string;
  wake_time: string;
  rem_min?: number;
  deep_min?: number;
  light_min?: number;
  source: SleepSource;
}

export interface HealthMetrics {
  user_id: string;
  date: string;
  resting_hr?: number;
  steps?: number;
  active_calories?: number;
  hrv?: number;
  source: string;
}

export interface HabitEntry {
  id: string;
  user_id: string;
  habit_name: string;
  target_value: number;
  actual_value: number;
  unit: string;
  date: string;
  streak_count: number;
}

export interface AccountabilityEvent {
  id: string;
  user_id: string;
  date: string;
  event_type: AccountabilityEventType;
  message_sent: string;
  acted_on: boolean;
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start: string;
  completion_pct: number;
  avg_nutrition_score: number;
  weight_delta_kg: number;
  avg_sleep_score: number;
  ai_summary: string;
  adjustments: PlanAdjustment[];
  created_at: string;
}

export interface PlanAdjustment {
  type: 'increase_intensity' | 'reduce_volume' | 'metabolic_reset' | 'sleep_focus' | 'streak_recovery';
  description: string;
  applied_to_week: number;
}

export interface CalendarConflict {
  date: string;
  event_title: string;
  event_start: string;
  event_end: string;
  available_window_min: number;
  variant_used: WorkoutVariant;
  rescheduled_to?: string;
}

export interface NotificationConfig {
  user_id: string;
  morning_ritual_time: string;
  workout_reminder_enabled: boolean;
  meal_reminder_enabled: boolean;
  sleep_reminder_enabled: boolean;
  streak_alerts_enabled: boolean;
  accountability_enabled: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  duration_weeks: number;
  phases: WorkoutPhase[];
}

export interface WorkoutPhase {
  phase_number: PhaseNumber;
  name: string;
  description: string;
  weeks_start: number;
  weeks_end: number;
  days: WorkoutDay[];
}

export interface DailyDashboard {
  date: string;
  greeting: string;
  trainer_tip: string;
  workout: WorkoutDay | null;
  workout_log: WorkoutLog | null;
  workout_variant: WorkoutVariant;
  available_window_min: number;
  calendar_conflict: CalendarConflict | null;
  nutrition: DailyNutrition;
  sleep: SleepLog | null;
  health: HealthMetrics | null;
  steps: number;
  water_ml: number;
  streak: number;
  rings: {
    workout: number;    // 0-1
    nutrition: number;  // 0-1
    sleep: number;      // 0-1
    steps: number;      // 0-1
    water: number;      // 0-1
  };
}
