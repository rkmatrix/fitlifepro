import { create } from 'zustand';
import { SleepLog, HealthMetrics, BodyMetrics } from '../types';
import { localDB } from '../lib/local-db';
import { format } from 'date-fns';

const SLEEP_KEY   = 'sleep_logs';
const HEALTH_KEY  = 'health_metrics';
const BODY_KEY    = 'body_metrics';

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

function calcSleepScore(durationMin: number): number {
  const optimal = 450;
  return Math.max(0, Math.round(100 - Math.abs(durationMin - optimal) * 0.3));
}

export const useHealthStore = create<HealthStore>((set) => ({
  todaySleep: null,
  sleepHistory: [],
  todayHealth: null,
  bodyMetrics: [],
  latestBodyMetrics: null,

  loadTodaySleep: async (_userId) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const logs = await localDB.get<SleepLog[]>(SLEEP_KEY) ?? [];
    set({ todaySleep: logs.find((l) => l.date === today) ?? null });
  },

  loadSleepHistory: async (_userId, days = 30) => {
    const cutoff = format(new Date(Date.now() - days * 86400000), 'yyyy-MM-dd');
    const logs = await localDB.get<SleepLog[]>(SLEEP_KEY) ?? [];
    set({
      sleepHistory: logs
        .filter((l) => l.date >= cutoff)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    });
  },

  loadHealthMetrics: async (_userId) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const all = await localDB.get<HealthMetrics[]>(HEALTH_KEY) ?? [];
    set({ todayHealth: all.find((h) => h.date === today) ?? null });
  },

  loadBodyMetrics: async (_userId) => {
    const all = await localDB.get<BodyMetrics[]>(BODY_KEY) ?? [];
    const sorted = all.sort((a, b) => (a.date < b.date ? 1 : -1));
    set({ bodyMetrics: sorted, latestBodyMetrics: sorted[0] ?? null });
  },

  logBodyMetrics: async (_userId, metrics) => {
    const newEntry: BodyMetrics = {
      ...metrics,
      id: `bm_${Date.now()}`,
      user_id: 'local',
    };
    const all = await localDB.get<BodyMetrics[]>(BODY_KEY) ?? [];
    const updated = [newEntry, ...all.filter((m) => m.date !== metrics.date)];
    await localDB.set(BODY_KEY, updated);
    set({ bodyMetrics: updated, latestBodyMetrics: newEntry });
  },

  logSleepManual: async (_userId, bedtime, wakeTime) => {
    const durationMin = Math.round((wakeTime.getTime() - bedtime.getTime()) / 60000);
    const log: SleepLog = {
      id: `sl_${Date.now()}`,
      user_id: 'local',
      date: format(wakeTime, 'yyyy-MM-dd'),
      duration_min: durationMin,
      sleep_score: calcSleepScore(durationMin),
      bedtime: bedtime.toISOString(),
      wake_time: wakeTime.toISOString(),
      source: 'manual',
    };
    const all = await localDB.get<SleepLog[]>(SLEEP_KEY) ?? [];
    const updated = [log, ...all.filter((l) => l.date !== log.date)];
    await localDB.set(SLEEP_KEY, updated);
    set({ todaySleep: log });
  },
}));