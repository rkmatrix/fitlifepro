import { create } from 'zustand';
import { FoodEntry, DailyNutrition, FoodItem, MealType } from '../types';
import { localDB } from '../lib/local-db';
import { format } from 'date-fns';
import {
  DEFAULT_CALORIE_TARGET,
  DEFAULT_PROTEIN_TARGET,
  DEFAULT_CARB_TARGET,
  DEFAULT_FAT_TARGET,
} from '../constants/config';

const ENTRIES_KEY = 'food_entries';
const WATER_KEY   = 'daily_water';

interface NutritionStore {
  today: DailyNutrition;
  history: Record<string, DailyNutrition>;
  recentFoods: FoodItem[];

  loadToday: (userId: string) => Promise<void>;
  loadForDate: (userId: string, date: string) => Promise<DailyNutrition>;
  logFood: (userId: string, entry: Omit<FoodEntry, 'id' | 'logged_at'> & { logged_at?: string }) => Promise<void>;
  removeFood: (entryId: string) => Promise<void>;
  updateWater: (userId: string, amountMl: number) => Promise<void>;
}

const emptyDay = (date: string): DailyNutrition => ({
  date,
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  water_ml: 0,
  target_calories: DEFAULT_CALORIE_TARGET,
  target_protein: DEFAULT_PROTEIN_TARGET,
  target_carbs: DEFAULT_CARB_TARGET,
  target_fat: DEFAULT_FAT_TARGET,
  entries: [],
});

function buildDay(date: string, entries: FoodEntry[], water_ml: number): DailyNutrition {
  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  return {
    date,
    ...totals,
    water_ml,
    target_calories: DEFAULT_CALORIE_TARGET,
    target_protein: DEFAULT_PROTEIN_TARGET,
    target_carbs: DEFAULT_CARB_TARGET,
    target_fat: DEFAULT_FAT_TARGET,
    entries,
  };
}

export const useNutritionStore = create<NutritionStore>((set, get) => ({
  today: emptyDay(format(new Date(), 'yyyy-MM-dd')),
  history: {},
  recentFoods: [],

  loadToday: async (_userId) => {
    const date = format(new Date(), 'yyyy-MM-dd');
    const allEntries = await localDB.get<FoodEntry[]>(ENTRIES_KEY) ?? [];
    const entries = allEntries.filter((e) => e.date === date);
    const waterMap = await localDB.get<Record<string, number>>(WATER_KEY) ?? {};
    set({ today: buildDay(date, entries, waterMap[date] ?? 0) });
  },

  loadForDate: async (_userId, date) => {
    const allEntries = await localDB.get<FoodEntry[]>(ENTRIES_KEY) ?? [];
    const entries = allEntries.filter((e) => e.date === date);
    const waterMap = await localDB.get<Record<string, number>>(WATER_KEY) ?? {};
    const dayNutrition = buildDay(date, entries, waterMap[date] ?? 0);
    set((s) => ({ history: { ...s.history, [date]: dayNutrition } }));
    return dayNutrition;
  },

  logFood: async (_userId, entry) => {
    const newEntry: FoodEntry = {
      ...entry,
      id: `fe_${Date.now()}`,
      logged_at: entry.logged_at ?? new Date().toISOString(),
    };
    const allEntries = await localDB.get<FoodEntry[]>(ENTRIES_KEY) ?? [];
    await localDB.set(ENTRIES_KEY, [...allEntries, newEntry]);

    const { today } = get();
    if (newEntry.date === today.date) {
      set({
        today: {
          ...today,
          calories: today.calories + newEntry.calories,
          protein: today.protein + newEntry.protein,
          carbs: today.carbs + newEntry.carbs,
          fat: today.fat + newEntry.fat,
          entries: [...today.entries, newEntry],
        },
      });
    }
  },

  removeFood: async (entryId) => {
    const { today } = get();
    const removed = today.entries.find((e) => e.id === entryId);
    if (!removed) return;

    const allEntries = await localDB.get<FoodEntry[]>(ENTRIES_KEY) ?? [];
    await localDB.set(ENTRIES_KEY, allEntries.filter((e) => e.id !== entryId));

    set({
      today: {
        ...today,
        calories: today.calories - removed.calories,
        protein: today.protein - removed.protein,
        carbs: today.carbs - removed.carbs,
        fat: today.fat - removed.fat,
        entries: today.entries.filter((e) => e.id !== entryId),
      },
    });
  },

  updateWater: async (_userId, amountMl) => {
    const date = format(new Date(), 'yyyy-MM-dd');
    const waterMap = await localDB.get<Record<string, number>>(WATER_KEY) ?? {};
    waterMap[date] = amountMl;
    await localDB.set(WATER_KEY, waterMap);
    set({ today: { ...get().today, water_ml: amountMl } });
  },
}));