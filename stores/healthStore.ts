import { create } from 'zustand';
import { SleepLog, HealthMetrics, BodyMetrics } from '../types';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { IS_DEMO, DEMO_SLEEP, DEMO_HEALTH, DEMO_BODY_METRICS, DEMO_SLEEP_HISTORY } from '../constants/demo';

interface HealthStore {
  todaySleep: SleepLog | null;
  sleepHistory: SleepLog[];
  todayHealth: HealthMetrics | null;
  bodyMetrics: BodyMetrics[];
  latestBodyMetrics: BodyMetrics | null;

  loadTodaySleep: (userId: string) => Promise<void>;
  loadSleepHistory: (userId: string, days?: number) => Promise<void>;
  loadHealthMetrics: (userId: string) => Promise<void>;
  loadBodyMetrics: (userId: string) => Promise<void>;
  logBodyMetrics: (userId: string, metrics: Omit<BodyMetrics, 'id' | 'user_id'>) => Promise<void>;
  logSleepManual: (userId: string, bedtime: Date, wakeTime: Date) => Promise<void>;
}

function calculateSleepScore(durationMin: number): number {
  // Based on sleep duration vs optimal 7–8 hours
  const optimal = 450; // 7.5 hours
  const diff = Math.abs(durationMin - optimal);
  const score = Math.max(0, 100 - diff * 0.3);
  return Math.round(score);
}

export const useHealthStore = create<HealthStore>((set) => ({
  todaySleep: null,
  sleepHistory: [],
  todayHealth: null,
  bodyMetrics: [],
  latestBodyMetrics: null,

  loadTodaySleep: async (userId) => {
    if (IS_DEMO) { set({ todaySleep: null }); return; }  // No dummy sleep
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    set({ todaySleep: (data as SleepLog | null) });
  },

  loadSleepHistory: async (userId, days = 30) => {
    if (IS_DEMO) { set({ sleepHistory: [] }); return; }  // No dummy history
    const cutoff = format(
      new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      'yyyy-MM-dd'
    );
    const { data } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', cutoff)
      .order('date', { ascending: false });
    set({ sleepHistory: (data ?? []) as SleepLog[] });
  },

  loadHealthMetrics: async (userId) => {
    if (IS_DEMO) { set({ todayHealth: null }); return; }  // No dummy metrics
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    set({ todayHealth: (data as HealthMetrics | null) });
  },

  loadBodyMetrics: async (userId) => {
    if (IS_DEMO) {
      set({ bodyMetrics: [], latestBodyMetrics: null });  // No dummy body metrics
      return;
    }
    const { data } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(60);
    const metrics = (data ?? []) as BodyMetrics[];
    set({ bodyMetrics: metrics, latestBodyMetrics: metrics[0] ?? null });
  },

  logBodyMetrics: async (userId, metrics) => {
    const { data } = await supabase
      .from('body_metrics')
      .insert({ user_id: userId, ...metrics })
      .select()
      .single();
    if (data) {
      const all = [data as BodyMetrics, ...useHealthStore.getState().bodyMetrics];
      set({ bodyMetrics: all, latestBodyMetrics: data as BodyMetrics });
    }
  },

  logSleepManual: async (userId, bedtime, wakeTime) => {
    const durationMin = Math.round((wakeTime.getTime() - bedtime.getTime()) / 60000);
    const log: Omit<SleepLog, 'id'> = {
      user_id: userId,
      date: format(wakeTime, 'yyyy-MM-dd'),
      duration_min: durationMin,
      sleep_score: calculateSleepScore(durationMin),
      bedtime: bedtime.toISOString(),
      wake_time: wakeTime.toISOString(),
      source: 'manual',
    };
    const { data } = await supabase.from('sleep_logs').insert(log).select().single();
    if (data) set({ todaySleep: data as SleepLog });
  },
}));
