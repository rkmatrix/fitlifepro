import { supabase } from '../lib/supabase';
import { WeeklyReport, PlanAdjustment } from '../types';
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

export async function analyzeWeeklyData(userId: string): Promise<WeeklyData> {
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  // Workout completion
  const { data: logs } = await supabase
    .from('workout_logs')
    .select('status')
    .eq('user_id', userId)
    .gte('date', weekAgo);

  const totalExpected = 5;
  const completed = (logs ?? []).filter((l) =>
    ['done', 'partial', 'makeup'].includes(l.status)
  ).length;
  const completionPct = Math.round((completed / totalExpected) * 100);

  // Sleep
  const { data: sleepLogs } = await supabase
    .from('sleep_logs')
    .select('sleep_score')
    .eq('user_id', userId)
    .gte('date', weekAgo);
  const sleepScores = (sleepLogs ?? []).map((s: { sleep_score: number }) => s.sleep_score);
  const avgSleepScore = sleepScores.length
    ? Math.round(sleepScores.reduce((a: number, b: number) => a + b, 0) / sleepScores.length)
    : 0;

  // Weight delta
  const { data: metrics } = await supabase
    .from('body_metrics')
    .select('weight_kg, date')
    .eq('user_id', userId)
    .gte('date', weekAgo)
    .order('date', { ascending: true });
  const weights = (metrics ?? []).map((m: { weight_kg: number }) => m.weight_kg);
  const weightDeltaKg =
    weights.length >= 2
      ? Math.round((weights[weights.length - 1] - weights[0]) * 100) / 100
      : 0;

  // User profile
  const { data: profile } = await supabase
    .from('users')
    .select('phase, week_number, name')
    .eq('id', userId)
    .single();

  return {
    completionPct,
    avgNutritionScore: 70, // Simplified — would calculate from food entries
    weightDeltaKg,
    avgSleepScore,
    currentPhase: (profile as { phase: number } | null)?.phase ?? 1,
    currentWeek: (profile as { week_number: number } | null)?.week_number ?? 1,
    userName: (profile as { name: string } | null)?.name ?? 'Champ',
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
      description: `Average sleep score ${data.avgSleepScore}. This week's priority is sleep. Cortisol is elevated — it prevents fat loss. Bedtime moved to 10 PM.`,
      applied_to_week: data.currentWeek + 1,
    });
  }

  if (data.weightDeltaKg === 0 && data.currentWeek > 4) {
    adjustments.push({
      type: 'metabolic_reset',
      description: `Weight plateau detected. Implementing metabolic reset: calorie cycling, new HIIT protocol, and changing exercise order.`,
      applied_to_week: data.currentWeek + 1,
    });
  }

  return adjustments;
}

export async function saveWeeklyReport(
  userId: string,
  data: WeeklyData,
  aiSummary: string
): Promise<WeeklyReport | null> {
  const adjustments = generateAdjustments(data);
  const report = {
    user_id: userId,
    week_start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    completion_pct: data.completionPct,
    avg_nutrition_score: data.avgNutritionScore,
    weight_delta_kg: data.weightDeltaKg,
    avg_sleep_score: data.avgSleepScore,
    ai_summary: aiSummary,
    adjustments,
    created_at: new Date().toISOString(),
  };

  const { data: saved } = await supabase
    .from('weekly_reports')
    .insert(report)
    .select()
    .single();

  return (saved as WeeklyReport | null);
}
