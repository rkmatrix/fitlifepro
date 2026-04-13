import { analyzeWorkoutWindow } from '../lib/calendar';
import { WorkoutDay, WorkoutVariant, CalendarConflict } from '../types';

export interface ScheduleResult {
  variant: WorkoutVariant;
  availableWindowMin: number;
  conflict: CalendarConflict | null;
  recommendation: string;
  exercises: string[];
}

/**
 * Main scheduling engine entry point.
 * Call this when user opens the app or taps "Start Workout".
 */
export async function resolveWorkoutSchedule(
  workoutDay: WorkoutDay,
  preferredStartTime: string
): Promise<ScheduleResult> {
  // Build a Date object for today's preferred workout time
  const [hour, min] = preferredStartTime.split(':').map(Number);
  const today = new Date();
  today.setHours(hour, min, 0, 0);

  const { availableWindowMin, variant, conflict } = await analyzeWorkoutWindow(
    today,
    workoutDay.full_duration_min
  );

  const exerciseIds = getExercisesForVariant(workoutDay, variant);
  const recommendation = buildRecommendation(variant, availableWindowMin, conflict);

  return {
    variant,
    availableWindowMin,
    conflict,
    recommendation,
    exercises: exerciseIds,
  };
}

function getExercisesForVariant(day: WorkoutDay, variant: WorkoutVariant): string[] {
  switch (variant) {
    case 'express':
      return day.express_exercises;
    case 'micro':
      return day.micro_exercises;
    case 'desk':
      return day.desk_exercises;
    default:
      return day.exercises.map((e) => e.exercise.id);
  }
}

function buildRecommendation(
  variant: WorkoutVariant,
  availableMin: number,
  conflict: CalendarConflict | null
): string {
  if (variant === 'full') {
    return `You have a clear ${availableMin}+ min window. Full workout is on.`;
  }
  if (variant === 'express') {
    const eventTitle = conflict?.event_title ?? 'upcoming event';
    return `You have ~${availableMin} min before "${eventTitle}". Express workout loaded — supersets only, no warmup. Go hard.`;
  }
  if (variant === 'micro') {
    return `Only ${availableMin} min available. Micro workout: 3 key exercises, no rest. Better than nothing — much better.`;
  }
  return `You have ${availableMin} min. Desk workout: can be done standing, right where you are. Move.`;
}

/**
 * Suggest available evening slots based on calendar availability.
 */
export async function suggestEveningSlot(
  workoutDay: WorkoutDay
): Promise<{ startTime: Date; variant: WorkoutVariant } | null> {
  const candidates = [17, 18, 19, 20]; // 5 PM – 8 PM

  for (const hour of candidates) {
    const candidate = new Date();
    candidate.setHours(hour, 0, 0, 0);

    const { availableWindowMin, variant } = await analyzeWorkoutWindow(
      candidate,
      workoutDay.full_duration_min
    );

    if (availableWindowMin >= 20) {
      return { startTime: candidate, variant };
    }
  }
  return null;
}
