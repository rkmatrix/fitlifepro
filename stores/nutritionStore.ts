import { create } from 'zustand';
import { FoodEntry, DailyNutrition, FoodItem, MealType } from '../types';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { IS_DEMO, DEMO_NUTRITION } from '../constants/demo';
import {
  DEFAULT_CALORIE_TARGET,
  DEFAULT_PROTEIN_TARGET,
  DEFAULT_CARB_TARGET,
  DEFAULT_FAT_TARGET,
} from '../constants/config';

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

const emptyToday = (date: string): DailyNutrition => ({
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

export const useNutritionStore = create<NutritionStore>((set, get) => ({
  today: emptyToday(format(new Date(), 'yyyy-MM-dd')),
  history: {},
  recentFoods: [],

  loadToday: async (userId) => {
    if (IS_DEMO) { set({ today: DEMO_NUTRITION }); return; }
    const date = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);

    const entries = (data ?? []) as FoodEntry[];
    const totals = entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const { data: waterData } = await supabase
      .from('daily_water')
      .select('amount_ml')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    set({
      today: {
        date,
        ...totals,
        water_ml: (waterData as { amount_ml: number } | null)?.amount_ml ?? 0,
        target_calories: DEFAULT_CALORIE_TARGET,
        target_protein: DEFAULT_PROTEIN_TARGET,
        target_carbs: DEFAULT_CARB_TARGET,
        target_fat: DEFAULT_FAT_TARGET,
        entries,
      },
    });
  },

  loadForDate: async (userId, date) => {
    const { data } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);

    const entries = (data ?? []) as FoodEntry[];
    const totals = entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const { data: waterData } = await supabase
      .from('daily_water')
      .select('amount_ml')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    const dayNutrition: DailyNutrition = {
      date,
      ...totals,
      water_ml: (waterData as { amount_ml: number } | null)?.amount_ml ?? 0,
      target_calories: DEFAULT_CALORIE_TARGET,
      target_protein: DEFAULT_PROTEIN_TARGET,
      target_carbs: DEFAULT_CARB_TARGET,
      target_fat: DEFAULT_FAT_TARGET,
      entries,
    };

    set((s) => ({ history: { ...s.history, [date]: dayNutrition } }));
    return dayNutrition;
  },

  logFood: async (userId, entry) => {
    const newEntry = {
      ...entry,
      logged_at: entry.logged_at ?? new Date().toISOString(),
    };
    const { data } = await supabase.from('food_entries').insert(newEntry).select().single();
    if (!data) return;
    const { today } = get();
    const updatedEntry = data as FoodEntry;
    set({
      today: {
        ...today,
        calories: today.calories + updatedEntry.calories,
        protein: today.protein + updatedEntry.protein,
        carbs: today.carbs + updatedEntry.carbs,
        fat: today.fat + updatedEntry.fat,
        entries: [...today.entries, updatedEntry],
      },
    });
  },

  removeFood: async (entryId) => {
    await supabase.from('food_entries').delete().eq('id', entryId);
    const { today } = get();
    const removed = today.entries.find((e) => e.id === entryId);
    if (!removed) return;
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

  updateWater: async (userId, amountMl) => {
    const date = format(new Date(), 'yyyy-MM-dd');
    await supabase.from('daily_water').upsert(
      { user_id: userId, date, amount_ml: amountMl },
      { onConflict: 'user_id,date' }
    );
    set({ today: { ...get().today, water_ml: amountMl } });
  },
}));
