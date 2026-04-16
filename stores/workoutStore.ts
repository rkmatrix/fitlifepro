import { create } from 'zustand';
import {
  WorkoutLog,
  WorkoutStatus,
  WorkoutVariant,
  ExerciseLog,
  CalendarConflict,
  WorkoutDay,
} from '../types';
import { localDB } from '../lib/local-db';
import { format } from 'date-fns';

const LOGS_KEY = 'workout_logs';

interface ActiveSession {
  workoutDay: WorkoutDay;
  variant: WorkoutVariant;
  startTime: string; // ISO string (serialisable)
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

async function persistLogs(logs: WorkoutLog[]) {
  await localDB.set(LOGS_KEY, logs);
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
        startTime: new Date().toISOString(),
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
    const { activeSession, logs } = get();
    if (!activeSession) return;

    const startTime = new Date(activeSession.startTime);
    const duration = Math.floor((Date.now() - startTime.getTime()) / 60000);

    const log: WorkoutLog = {
      id: `wl_${Date.now()}`,
      user_id: 'local',
      date: format(new Date(), 'yyyy-MM-dd'),
      workout_day_id: activeSession.workoutDay.id,
      status,
      variant: activeSession.variant,
      duration_min: duration,
      exercise_logs: activeSession.exerciseLogs,
    };

    const today = format(new Date(), 'yyyy-MM-dd');
    const updatedLogs = [log, ...logs.filter((l) => l.date !== today)];
    await persistLogs(updatedLogs);
    set({ todayLog: log, activeSession: null, logs: updatedLogs });
  },

  cancelSession: () => set({ activeSession: null }),

  setCalendarConflict: (conflict) => set({ calendarConflict: conflict }),

  loadTodayLog: async (_userId) => {
    const allLogs = await localDB.get<WorkoutLog[]>(LOGS_KEY) ?? [];
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayLog = allLogs.find((l) => l.date === today) ?? null;
    set({ todayLog });
  },

  loadLogs: async (_userId, days = 90) => {
    const allLogs = await localDB.get<WorkoutLog[]>(LOGS_KEY) ?? [];
    const cutoff = format(new Date(Date.now() - days * 86400000), 'yyyy-MM-dd');
    const filtered = allLogs.filter((l) => l.date >= cutoff);
    set({ logs: filtered });
  },

  calculateStreak: async (_userId) => {
    const allLogs = await localDB.get<WorkoutLog[]>(LOGS_KEY) ?? [];
    const done = allLogs
      .filter((l) => ['done', 'partial', 'makeup'].includes(l.status))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    if (!done.length) { set({ streak: 0 }); return 0; }

    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    for (const log of done) {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      const diff = Math.floor((checkDate.getTime() - logDate.getTime()) / 86400000);
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

  markWorkout: async (status, _userId, workoutDayId) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const allLogs = await localDB.get<WorkoutLog[]>(LOGS_KEY) ?? [];

    const log: WorkoutLog = {
      id: `wl_${Date.now()}`,
      user_id: 'local',
      date: today,
      workout_day_id: workoutDayId,
      status,
      variant: 'full',
      duration_min: 0,
      exercise_logs: [],
    };

    const updatedLogs = [log, ...allLogs.filter((l) => l.date !== today)];
    await persistLogs(updatedLogs);
    set({ todayLog: log, logs: updatedLogs });
  },
}));