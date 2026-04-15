import { create } from 'zustand';
import {
  WorkoutLog,
  WorkoutStatus,
  WorkoutVariant,
  ExerciseLog,
  CalendarConflict,
  WorkoutDay,
} from '../types';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { IS_DEMO, DEMO_TODAY_LOG, DEMO_LOGS, DEMO_STREAK } from '../constants/demo';

interface ActiveSession {
  workoutDay: WorkoutDay;
  variant: WorkoutVariant;
  startTime: Date;
  currentExerciseIndex: number;
  currentSet: number;
  exerciseLogs: ExerciseLog[];
  isPaused: boolean;
  elapsedSec: number;
}

interface WorkoutStore {
  logs: WorkoutLog[];
  activeSession: ActiveSession | null;
  todayLog: WorkoutLog | null;
  calendarConflict: CalendarConflict | null;
  streak: number;

  startSession: (workoutDay: WorkoutDay, variant: WorkoutVariant) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  advanceExercise: () => void;
  logSet: (exerciseId: string, reps: number, weight: number) => void;
  finishSession: (status: WorkoutStatus) => Promise<void>;
  cancelSession: () => void;

  setCalendarConflict: (conflict: CalendarConflict | null) => void;
  loadTodayLog: (userId: string) => Promise<void>;
  loadLogs: (userId: string, days?: number) => Promise<void>;
  calculateStreak: (userId: string) => Promise<number>;

  markWorkout: (status: WorkoutStatus, userId: string, workoutDayId: string) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  logs: [],
  activeSession: null,
  todayLog: null,
  calendarConflict: null,
  streak: 0,

  startSession: (workoutDay, variant) => {
    set({
      activeSession: {
        workoutDay,
        variant,
        startTime: new Date(),
        currentExerciseIndex: 0,
        currentSet: 1,
        exerciseLogs: workoutDay.exercises.map((ex) => ({
          exercise_id: ex.exercise.id,
          sets_completed: 0,
          reps_per_set: [],
          weight_per_set: [],
        })),
        isPaused: false,
        elapsedSec: 0,
      },
    });
  },

  pauseSession: () => {
    const { activeSession } = get();
    if (activeSession) set({ activeSession: { ...activeSession, isPaused: true } });
  },

  resumeSession: () => {
    const { activeSession } = get();
    if (activeSession) set({ activeSession: { ...activeSession, isPaused: false } });
  },

  advanceExercise: () => {
    const { activeSession } = get();
    if (!activeSession) return;
    const nextIndex = activeSession.currentExerciseIndex + 1;
    if (nextIndex < activeSession.workoutDay.exercises.length) {
      set({ activeSession: { ...activeSession, currentExerciseIndex: nextIndex, currentSet: 1 } });
    }
  },

  logSet: (exerciseId, reps, weight) => {
    const { activeSession } = get();
    if (!activeSession) return;
    const logs = activeSession.exerciseLogs.map((log) => {
      if (log.exercise_id === exerciseId) {
        return {
          ...log,
          sets_completed: log.sets_completed + 1,
          reps_per_set: [...log.reps_per_set, reps],
          weight_per_set: [...log.weight_per_set, weight],
        };
      }
      return log;
    });
    set({ activeSession: { ...activeSession, exerciseLogs: logs } });
  },

  finishSession: async (status) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const duration = Math.floor(
      (new Date().getTime() - activeSession.startTime.getTime()) / 60000
    );

    // Demo mode: update state directly without Supabase
    if (IS_DEMO) {
      const log: WorkoutLog = {
        id: `demo-session-${Date.now()}`,
        user_id: 'demo-user-001',
        date: format(new Date(), 'yyyy-MM-dd'),
        workout_day_id: activeSession.workoutDay.id,
        status,
        variant: activeSession.variant,
        duration_min: duration,
        exercise_logs: activeSession.exerciseLogs,
      };
      set({ todayLog: log, activeSession: null, logs: [log, ...get().logs] });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const log: Omit<WorkoutLog, 'id'> = {
      user_id: user.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      workout_day_id: activeSession.workoutDay.id,
      status,
      variant: activeSession.variant,
      duration_min: duration,
      exercise_logs: activeSession.exerciseLogs,
    };

    const { data } = await supabase.from('workout_logs').insert(log).select().single();
    if (data) {
      set({ todayLog: data as WorkoutLog, activeSession: null, logs: [data, ...get().logs] });
    } else {
      set({ activeSession: null });
    }
  },

  cancelSession: () => set({ activeSession: null }),

  setCalendarConflict: (conflict) => set({ calendarConflict: conflict }),

  loadTodayLog: async (userId) => {
    if (IS_DEMO) { set({ todayLog: DEMO_TODAY_LOG }); return; }
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    set({ todayLog: (data as WorkoutLog | null) });
  },

  loadLogs: async (userId, days = 90) => {
    if (IS_DEMO) { set({ logs: DEMO_LOGS }); return; }
    const cutoff = format(
      new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      'yyyy-MM-dd'
    );
    const { data } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', cutoff)
      .order('date', { ascending: false });
    set({ logs: (data ?? []) as WorkoutLog[] });
  },

  calculateStreak: async (userId) => {
    if (IS_DEMO) { set({ streak: DEMO_STREAK }); return DEMO_STREAK; }
    const { data } = await supabase
      .from('workout_logs')
      .select('date, status')
      .eq('user_id', userId)
      .in('status', ['done', 'partial', 'makeup'])
      .order('date', { ascending: false })
      .limit(60);

    if (!data || data.length === 0) {
      set({ streak: 0 });
      return 0;
    }

    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    for (const log of data) {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      const diff = Math.floor(
        (checkDate.getTime() - logDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (diff <= 1) {
        streak++;
        checkDate = logDate;
      } else {
        break;
      }
    }

    set({ streak });
    return streak;
  },

  markWorkout: async (status, userId, workoutDayId) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    // In demo mode, update state directly without Supabase
    if (IS_DEMO) {
      const demoLog: WorkoutLog = {
        id: `demo-log-${Date.now()}`,
        user_id: userId,
        date: today,
        workout_day_id: workoutDayId,
        status,
        variant: 'full',
        duration_min: 0,
        exercise_logs: [],
      };
      set((s) => ({ todayLog: demoLog, logs: [demoLog, ...s.logs.filter((l) => l.date !== today)] }));
      return;
    }
    const { data } = await supabase
      .from('workout_logs')
      .upsert(
        {
          user_id: userId,
          date: today,
          workout_day_id: workoutDayId,
          status,
          variant: 'full',
          duration_min: 0,
          exercise_logs: [],
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();

    if (data) set({ todayLog: data as WorkoutLog });
  },
}));
