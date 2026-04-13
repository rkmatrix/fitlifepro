-- FitLife Database Schema
-- Run in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  age integer not null,
  height_cm decimal(5,1) not null,
  weight_kg decimal(5,2) not null,
  goal_weight_kg decimal(5,2),
  target_calories integer default 2200,
  preferred_workout_time text default '07:00',
  calendar_sync_enabled boolean default true,
  health_sync_enabled boolean default false,
  phase integer default 1 check (phase between 1 and 4),
  week_number integer default 1,
  created_at timestamptz default now()
);

-- Workout logs
create table public.workout_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  workout_day_id text not null,
  status text not null check (status in ('done','partial','skipped','makeup','pending')),
  variant text not null default 'full' check (variant in ('full','express','micro','desk')),
  duration_min integer default 0,
  exercise_logs jsonb default '[]',
  notes text,
  posture_flags jsonb,
  calories_burned integer,
  created_at timestamptz default now(),
  unique (user_id, date)
);

-- Posture logs
create table public.posture_logs (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.workout_logs(id) on delete cascade,
  exercise_id text not null,
  timestamp timestamptz default now(),
  errors_detected text[],
  corrections_given text[],
  severity text check (severity in ('low','medium','high')),
  posture_score integer check (posture_score between 0 and 100)
);

-- Food items
create table public.food_items (
  id text primary key,
  name text not null,
  brand text,
  calories_per_100g decimal(7,2) not null default 0,
  protein_per_100g decimal(6,2) not null default 0,
  carbs_per_100g decimal(6,2) not null default 0,
  fat_per_100g decimal(6,2) not null default 0,
  fiber_per_100g decimal(6,2),
  sodium_per_100g decimal(7,2),
  source text not null check (source in ('USDA','OpenFoodFacts','custom')),
  barcode text,
  created_at timestamptz default now()
);

-- Food entries (diary)
create table public.food_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_item jsonb not null,
  quantity_g decimal(7,2) not null,
  calories decimal(7,2) not null,
  protein decimal(6,2) not null,
  carbs decimal(6,2) not null,
  fat decimal(6,2) not null,
  logged_at timestamptz default now()
);

-- Daily water intake
create table public.daily_water (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  amount_ml integer not null default 0,
  unique (user_id, date)
);

-- Meal prep plans
create table public.meal_prep_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  meals jsonb not null default '{}',
  shopping_list jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Custom videos
create table public.custom_videos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  youtube_url text not null,
  youtube_id text not null,
  thumbnail text,
  duration_sec integer,
  channel_name text,
  tags text[] default '{}',
  added_at timestamptz default now(),
  last_watched timestamptz,
  watch_count integer default 0
);

-- Body metrics
create table public.body_metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  weight_kg decimal(5,2) not null,
  waist_cm decimal(5,1),
  chest_cm decimal(5,1),
  hip_cm decimal(5,1),
  body_fat_pct decimal(4,1),
  bmi decimal(4,1),
  notes text,
  photo_url text,
  created_at timestamptz default now()
);

-- Sleep logs
create table public.sleep_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  duration_min integer not null,
  sleep_score integer check (sleep_score between 0 and 100),
  bedtime timestamptz,
  wake_time timestamptz,
  rem_min integer,
  deep_min integer,
  light_min integer,
  source text not null check (source in ('healthkit','healthconnect','manual')),
  unique (user_id, date)
);

-- Health metrics (daily)
create table public.health_metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  resting_hr integer,
  steps integer,
  active_calories integer,
  hrv integer,
  source text,
  unique (user_id, date)
);

-- Habits
create table public.habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  habit_name text not null,
  target_value decimal,
  actual_value decimal,
  unit text,
  date date not null,
  streak_count integer default 0,
  created_at timestamptz default now()
);

-- Accountability events
create table public.accountability_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  event_type text not null,
  message_sent text not null,
  acted_on boolean default false,
  created_at timestamptz default now()
);

-- Weekly reports
create table public.weekly_reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  completion_pct integer,
  avg_nutrition_score integer,
  weight_delta_kg decimal(5,2),
  avg_sleep_score integer,
  ai_summary text,
  adjustments jsonb default '[]',
  created_at timestamptz default now()
);

-- AI conversations
create table public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  messages jsonb not null default '[]',
  context_snapshot jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Calendar conflicts
create table public.calendar_conflicts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  calendar_event_title text,
  event_start timestamptz,
  event_end timestamptz,
  available_window_min integer,
  variant_used text,
  rescheduled_to timestamptz,
  created_at timestamptz default now()
);

-- Notification configs
create table public.notifications_config (
  user_id uuid primary key references public.users(id) on delete cascade,
  morning_ritual_time text default '06:00',
  workout_reminder_enabled boolean default true,
  meal_reminder_enabled boolean default true,
  sleep_reminder_enabled boolean default true,
  streak_alerts_enabled boolean default true,
  accountability_enabled boolean default true,
  updated_at timestamptz default now()
);

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.workout_logs enable row level security;
alter table public.food_entries enable row level security;
alter table public.daily_water enable row level security;
alter table public.body_metrics enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.health_metrics enable row level security;
alter table public.habits enable row level security;
alter table public.accountability_events enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.calendar_conflicts enable row level security;
alter table public.custom_videos enable row level security;
alter table public.notifications_config enable row level security;
alter table public.posture_logs enable row level security;

-- Users can only access their own data
create policy "Users: own data" on public.users for all using (auth.uid() = id);
create policy "Workout logs: own data" on public.workout_logs for all using (auth.uid() = user_id);
create policy "Food entries: own data" on public.food_entries for all using (auth.uid() = user_id);
create policy "Daily water: own data" on public.daily_water for all using (auth.uid() = user_id);
create policy "Body metrics: own data" on public.body_metrics for all using (auth.uid() = user_id);
create policy "Sleep logs: own data" on public.sleep_logs for all using (auth.uid() = user_id);
create policy "Health metrics: own data" on public.health_metrics for all using (auth.uid() = user_id);
create policy "Habits: own data" on public.habits for all using (auth.uid() = user_id);
create policy "Accountability events: own data" on public.accountability_events for all using (auth.uid() = user_id);
create policy "Weekly reports: own data" on public.weekly_reports for all using (auth.uid() = user_id);
create policy "AI conversations: own data" on public.ai_conversations for all using (auth.uid() = user_id);
create policy "Calendar conflicts: own data" on public.calendar_conflicts for all using (auth.uid() = user_id);
create policy "Custom videos: own data" on public.custom_videos for all using (auth.uid() = user_id);
create policy "Notifications config: own data" on public.notifications_config for all using (auth.uid() = user_id);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index on public.workout_logs (user_id, date desc);
create index on public.food_entries (user_id, date desc);
create index on public.body_metrics (user_id, date desc);
create index on public.sleep_logs (user_id, date desc);
create index on public.health_metrics (user_id, date desc);
create index on public.accountability_events (user_id, date desc);
