import { localDB } from '../lib/local-db';
import { WeeklyReport, PlanAdjustment, WorkoutLog, SleepLog, BodyMetrics, UserProfile } from '../types';
import { format, subDays } from 'date-fns';

export interface WeeklyData {
  completionPct: number;
  avgNutritionScore: number;
  weightDeltaKg: number;
  avgSleepScore: number;
  currentPhase: number;
  currentWeek: number;
  userName: string;
}

export async function analyzeWeeklyData(_userId: string): Promise<WeeklyData> {
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  // Workout completion
  const logs = await localDB.get<WorkoutLog[]>('workout_logs') ?? [];
  const weekLogs = logs.filter((l) => l.date >= weekAgo);
  const completed = weekLogs.filter((l) => ['done', 'partial', 'makeup'].includes(l.status)).length;
  const completionPct = Math.round((completed / 5) * 100);

  // Sleep
  const sleepLogs = await localDB.get<SleepLog[]>('sleep_logs') ?? [];
  const weekSleep = sleepLogs.filter((l) => l.date >= weekAgo);
  const avgSleepScore = weekSleep.length
    ? Math.round(weekSleep.reduce((a, b) => a + (b.sleep_score ?? 0), 0) / weekSleep.length)
    : 0;

  // Weight delta
  const metrics = await localDB.get<BodyMetrics[]>('body_metrics') ?? [];
  const weekMetrics = metrics.filter((m) => m.date >= weekAgo).sort((a, b) => (a.date < b.date ? -1 : 1));
  const weightDeltaKg =
    weekMetrics.length >= 2
      ? Math.round((weekMetrics[weekMetrics.length - 1].weight_kg - weekMetrics[0].weight_kg) * 100) / 100
      : 0;

  // Profile
  const profile = await localDB.get<UserProfile>('profile');

  return {
    completionPct,
    avgNutritionScore: 70,
    weightDeltaKg,
    avgSleepScore,
    currentPhase: profile?.phase ?? 1,
    currentWeek: profile?.week_number ?? 1,
    userName: profile?.name ?? 'Champ',
  };
}

export function generateAdjustments(data: WeeklyData): PlanAdjustment[] {
  const adjustments: PlanAdjustment[] = [];

  if (data.completionPct >= 80) {
    adjustments.push({
      type: 'increase_intensity',
      description: `Excellent ${data.completionPct}% completion. Adding one additional set to compound movements next week.`,
      applied_to_week: data.currentWeek + 1,
    });
  } else if (data.completionPct < 60) {
    adjustments.push({
      type: 'reduce_volume',
      description: `${data.completionPct}% completion this week. Next week: reduced volume, focus on showing up over output.`,
      applied_to_week: data.currentWeek + 1,
    });
  }

  if (data.avgSleepScore < 60) {
    adjustments.push({
      type: 'sleep_focus',
      description: `Average sleep score ${data.avgSleepScore}. Priority this week is sleep. Bedtime: 10 PM.`,
      applied_to_week: data.currentWeek + 1,
    });
  }

  if (data.weightDeltaKg === 0 && data.currentWeek > 4) {
    adjustments.push({
      type: 'metabolic_reset',
      description: `Weight plateau detected. Implementing metabolic reset: calorie cycling, new HIIT protocol.`,
      applied_to_week: data.currentWeek + 1,
    });
  }

  return adjustments;
}

export async function saveWeeklyReport(
  _userId: string,
  data: WeeklyData,
  aiSummary: string
): Promise<WeeklyReport | null> {
  const adjustments = generateAdjustments(data);
  const report: WeeklyReport = {
    id: `wr_${Date.now()}`,
    user_id: 'local',
    week_start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    completion_pct: data.completionPct,
    avg_nutrition_score: data.avgNutritionScore,
    weight_delta_kg: data.weightDeltaKg,
    avg_sleep_score: data.avgSleepScore,
    ai_summary: aiSummary,
    adjustments,
    created_at: new Date().toISOString(),
  };

  const all = await localDB.get<WeeklyReport[]>('weekly_reports') ?? [];
  await localDB.set('weekly_reports', [report, ...all]);
  return report;
}