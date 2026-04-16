import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { Ring } from '../../components/shared/Ring';
import { useNutritionStore } from '../../stores/nutritionStore';
import { useUserStore } from '../../stores/userStore';
import { searchUSDAFoods, calculateNutrients } from '../../lib/foodapi';
import { FoodItem, MealType, DailyNutrition } from '../../types';
import { MEAL_SUGGESTIONS } from '../../constants/workoutPlan';
import {
  DEFAULT_CALORIE_TARGET, DEFAULT_PROTEIN_TARGET,
  DEFAULT_CARB_TARGET, DEFAULT_FAT_TARGET,
} from '../../constants/config';

const MEAL_LABELS: Record<MealType, { emoji: string; label: string }> = {
  breakfast: { emoji: '🌅', label: 'Breakfast' },
  lunch: { emoji: '☀️', label: 'Lunch' },
  dinner: { emoji: '🌙', label: 'Dinner' },
  snack: { emoji: '🍎', label: 'Snack' },
};

const MEAL_TIMES: Record<MealType, string> = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '20:00',
  snack: '16:00',
};

const HOUR_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

type Tab = 'diary' | 'search' | 'mealprep' | 'insights';

// ─── Eating Insights ──────────────────────────────────────────────────────────
function EatingInsights({ history }: { history: Record<string, DailyNutrition> }) {
  const allEntries = Object.values(history).flatMap((d) => d.entries);

  if (allEntries.length < 3) {
    return (
      <View style={insightStyles.empty}>
        <Text style={insightStyles.emptyIcon}>📊</Text>
        <Text style={insightStyles.emptyTitle}>Not enough data yet</Text>
        <Text style={insightStyles.emptySub}>Log food for at least 3 days to see eating insights.</Text>
      </View>
    );
  }

  // Meal timing analysis
  const mealTimings: Record<MealType, number[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  allEntries.forEach((e) => {
    const hour = new Date(e.logged_at).getHours();
    if (e.meal_type in mealTimings) mealTimings[e.meal_type as MealType].push(hour);
  });

  const avgHour = (hours: number[]) => {
    if (!hours.length) return null;
    const avg = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
    return avg < 12 ? `${avg}:00 AM` : `${avg === 12 ? 12 : avg - 12}:00 PM`;
  };

  // Daily calorie trend (last 7 days)
  const sortedDays = Object.entries(history)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);

  const avgCalories = sortedDays.length
    ? Math.round(sortedDays.reduce((sum, [, d]) => sum + d.calories, 0) / sortedDays.length)
    : 0;

  // Consistency score (how many days food was logged)
  const daysLogged = Object.values(history).filter((d) => d.calories > 0).length;
  const totalDays = Math.max(Object.keys(history).length, 1);
  const consistencyPct = Math.round((daysLogged / totalDays) * 100);

  // Protein hit rate
  const daysHitProtein = Object.values(history).filter((d) => d.protein >= DEFAULT_PROTEIN_TARGET * 0.9).length;
  const proteinPct = Math.round((daysHitProtein / Math.max(daysLogged, 1)) * 100);

  return (
    <View>
      {/* Eating Times */}
      <View style={insightStyles.card}>
        <Text style={insightStyles.cardTitle}>🕐 Eating Times</Text>
        {(Object.keys(MEAL_LABELS) as MealType[]).map((meal) => {
          const avg = avgHour(mealTimings[meal]);
          return (
            <View key={meal} style={insightStyles.timingRow}>
              <Text style={insightStyles.timingEmoji}>{MEAL_LABELS[meal].emoji}</Text>
              <Text style={insightStyles.timingMeal}>{MEAL_LABELS[meal].label}</Text>
              <Text style={insightStyles.timingAvg}>
                {avg ? `Usually at ${avg}` : 'Not logged often'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Calorie trend */}
      <View style={insightStyles.card}>
        <Text style={insightStyles.cardTitle}>📈 Calorie Trend (Last 7 Days)</Text>
        <View style={insightStyles.barChart}>
          {sortedDays.map(([date, data]) => {
            const pct = Math.min(1, data.calories / DEFAULT_CALORIE_TARGET);
            const isOver = data.calories > DEFAULT_CALORIE_TARGET;
            return (
              <View key={date} style={insightStyles.barCol}>
                <Text style={insightStyles.barValue}>{data.calories > 0 ? data.calories : '—'}</Text>
                <View style={insightStyles.barTrack}>
                  <View style={[insightStyles.barFill, { height: `${pct * 100}%` as any, backgroundColor: isOver ? Colors.error : Colors.primary }]} />
                </View>
                <Text style={insightStyles.barDate}>{format(parseISO(date), 'EEE')}</Text>
              </View>
            );
          })}
        </View>
        <Text style={insightStyles.avgText}>7-day average: {avgCalories} kcal / {DEFAULT_CALORIE_TARGET} goal</Text>
      </View>

      {/* Habit scores */}
      <View style={insightStyles.card}>
        <Text style={insightStyles.cardTitle}>🎯 Habit Scores</Text>
        {[
          { label: 'Logging consistency', pct: consistencyPct, color: Colors.primary },
          { label: 'Protein goal hit rate', pct: proteinPct, color: Colors.accent },
        ].map((s) => (
          <View key={s.label} style={insightStyles.scoreRow}>
            <View style={insightStyles.scoreLabelRow}>
              <Text style={insightStyles.scoreLabel}>{s.label}</Text>
              <Text style={[insightStyles.scorePct, { color: s.color }]}>{s.pct}%</Text>
            </View>
            <View style={insightStyles.scoreTrack}>
              <View style={[insightStyles.scoreFill, { width: `${s.pct}%` as any, backgroundColor: s.color }]} />
            </View>
          </View>
        ))}
      </View>

      {/* Insights tips */}
      <View style={[insightStyles.card, { backgroundColor: `${Colors.primary}08`, borderColor: `${Colors.primary}20`, borderWidth: 1 }]}>
        <Text style={insightStyles.cardTitle}>💡 AI Insights</Text>
        {avgCalories < DEFAULT_CALORIE_TARGET * 0.85 && (
          <Text style={insightStyles.tipText}>• You're consistently under your calorie goal — make sure you're eating enough to support your training.</Text>
        )}
        {avgCalories > DEFAULT_CALORIE_TARGET * 1.1 && (
          <Text style={insightStyles.tipText}>• You're regularly exceeding your calorie goal. Focus on portion control at dinner time.</Text>
        )}
        {proteinPct < 50 && (
          <Text style={insightStyles.tipText}>• You're missing your protein goal most days. Add a protein shake post-workout or include more dal/eggs/chicken.</Text>
        )}
        {consistencyPct < 70 && (
          <Text style={insightStyles.tipText}>• Logging consistency is below 70%. Even rough tracking is better than none — try logging just your main meals.</Text>
        )}
        {consistencyPct >= 70 && proteinPct >= 70 && avgCalories > 0 && (
          <Text style={insightStyles.tipText}>• Great consistency! Your nutrition habits are solid. Keep prioritising protein and timing your meals around workouts.</Text>
        )}
      </View>
    </View>
  );
}

const insightStyles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.small },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  timingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  timingEmoji: { fontSize: 16, width: 24, textAlign: 'center' },
  timingMeal: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  timingAvg: { fontSize: FontSize.sm, color: Colors.textSecondary },
  barChart: { flexDirection: 'row', gap: 6, height: 80, alignItems: 'flex-end', marginBottom: Spacing.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 2 },
  barValue: { fontSize: 9, color: Colors.textTertiary },
  barTrack: { flex: 1, width: '100%', backgroundColor: Colors.border, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 4 },
  barDate: { fontSize: 9, color: Colors.textTertiary, fontWeight: '600' },
  avgText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  scoreRow: { marginBottom: Spacing.sm },
  scoreLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  scoreLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  scorePct: { fontSize: FontSize.sm, fontWeight: '800' },
  scoreTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  scoreFill: { height: 6, borderRadius: 3 },
  tipText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xs },
});

// ─── Time picker for food logging ─────────────────────────────────────────────
function TimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {HOUR_OPTIONS.map((t) => {
          const active = value === t;
          const h = parseInt(t);
          const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
          return (
            <TouchableOpacity
              key={t}
              style={[tpStyles.chip, active && tpStyles.chipActive]}
              onPress={() => onChange(t)}
            >
              <Text style={[tpStyles.chipText, active && tpStyles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const tpStyles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function NutritionScreen() {
  const { profile } = useUserStore();
  const { today, history, loadToday, loadForDate, logFood, removeFood, updateWater } = useNutritionStore();

  const [tab, setTab] = useState<Tab>('diary');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [diaryData, setDiaryData] = useState<DailyNutrition>(today);
  const [loadingDate, setLoadingDate] = useState(false);

  // Food search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [eatTime, setEatTime] = useState(MEAL_TIMES.lunch);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (profile) loadToday(profile.id);
  }, [profile]);

  useEffect(() => {
    if (isToday) {
      setDiaryData(today);
    }
  }, [today, isToday]);

  const navigateDate = async (delta: number) => {
    const newDate = format(
      addDays(parseISO(selectedDate), delta),
      'yyyy-MM-dd',
    );
    setSelectedDate(newDate);

    const newIsToday = newDate === format(new Date(), 'yyyy-MM-dd');
    if (newIsToday) {
      setDiaryData(today);
    } else if (history[newDate]) {
      setDiaryData(history[newDate]);
    } else if (profile) {
      setLoadingDate(true);
      const data = await loadForDate(profile.id, newDate);
      setDiaryData(data);
      setLoadingDate(false);
    }
  };

  const handleSearch = useCallback(async (q: string) => {
    const query = q.trim();
    if (!query) { setSearchResults([]); setSearchError(null); return; }
    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchUSDAFoods(query, 20);
      setSearchResults(results);
      if (results.length === 0) setSearchError(`No results for "${query}". Try a different spelling.`);
    } catch {
      setSearchError('Search failed. Check your internet connection and try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const onSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (text.trim().length >= 2) {
      debounceTimer.current = setTimeout(() => handleSearch(text), 500);
    } else if (!text.trim()) {
      setSearchResults([]);
      setSearchError(null);
    }
  };

  const handleLogFood = async () => {
    if (!selectedFood || !profile) return;
    const g = parseFloat(quantity) || 100;
    const nutrients = calculateNutrients(selectedFood, g);

    // Build logged_at from the selected date + eat time
    const loggedAt = new Date(`${selectedDate}T${eatTime}:00`).toISOString();

    await logFood(profile.id, {
      user_id: profile.id,
      date: selectedDate,
      meal_type: selectedMeal,
      food_item: selectedFood,
      quantity_g: g,
      logged_at: loggedAt,
      ...nutrients,
    });

    setSelectedFood(null);
    setQuantity('100');
    setTab('diary');
    // Reload diary if logging for a non-today date
    if (!isToday && profile) {
      const data = await loadForDate(profile.id, selectedDate);
      setDiaryData(data);
    }
  };

  const mealEntries = (mealType: MealType) =>
    diaryData.entries.filter((e) => e.meal_type === mealType);
  const calorieGoal = profile?.target_calories ?? DEFAULT_CALORIE_TARGET;
  const calLeft = calorieGoal - diaryData.calories;
  const calPct = Math.min(1, diaryData.calories / calorieGoal);

  // Load history for insights
  useEffect(() => {
    if (tab === 'insights' && profile) {
      // Load last 14 days for insights
      Array.from({ length: 14 }, (_, i) => {
        const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
        if (!history[d]) loadForDate(profile.id, d).catch(() => {});
      });
    }
  }, [tab, profile]);

  const dateLabel = isToday
    ? 'Today'
    : selectedDate === format(subDays(new Date(), 1), 'yyyy-MM-dd')
    ? 'Yesterday'
    : format(parseISO(selectedDate), 'MMM d, yyyy');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with date navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateDate(-1)} style={styles.dateNavBtn}>
          <Text style={styles.dateNavArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.title}>Nutrition</Text>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigateDate(1)}
          style={[styles.dateNavBtn, isToday && styles.dateNavBtnDisabled]}
          disabled={isToday}
        >
          <Text style={[styles.dateNavArrow, isToday && styles.dateNavArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Calorie summary card */}
      <View style={styles.calCard}>
        <View style={styles.calLeft}>
          <Text style={styles.calLabel}>{isToday ? "Today's Calories" : `${format(parseISO(selectedDate), 'MMM d')} Calories`}</Text>
          <View style={styles.calRow}>
            <Text style={styles.calConsumed}>{diaryData.calories}</Text>
            <Text style={styles.calDivider}> / </Text>
            <Text style={styles.calGoal}>{calorieGoal}</Text>
          </View>
          <Text style={[styles.calRemaining, calLeft >= 0 ? styles.calRemainingGood : styles.calRemainingOver]}>
            {calLeft >= 0 ? `${calLeft} remaining` : `${Math.abs(calLeft)} over goal`}
          </Text>
        </View>
        <Ring progress={calPct} color={Colors.primary} size={80} label="" centerText={`${Math.round(calPct * 100)}%`} />
      </View>

      {/* Macro bars */}
      <View style={styles.macroCard}>
        {[
          { label: 'Carbs', value: diaryData.carbs, goal: diaryData.target_carbs || DEFAULT_CARB_TARGET, color: Colors.secondary },
          { label: 'Fat', value: diaryData.fat, goal: diaryData.target_fat || DEFAULT_FAT_TARGET, color: '#A55EEA' },
          { label: 'Protein', value: diaryData.protein, goal: diaryData.target_protein || DEFAULT_PROTEIN_TARGET, color: Colors.accent },
        ].map((m) => (
          <View key={m.label} style={styles.macroRow}>
            <View style={styles.macroLabelRow}>
              <Text style={styles.macroLabel}>{m.label}</Text>
              <Text style={styles.macroValues}>
                <Text style={styles.macroVal}>{Math.round(m.value)}g</Text>
                <Text style={styles.macroGoal}> / {m.goal}g</Text>
              </Text>
            </View>
            <View style={styles.macroTrack}>
              <View style={[styles.macroFill, { width: `${Math.min(1, m.value / m.goal) * 100}%`, backgroundColor: m.color }]} />
            </View>
          </View>
        ))}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {([
          { id: 'diary', label: '📓 Diary' },
          { id: 'search', label: '🔍 Log Food' },
          { id: 'mealprep', label: '🍱 Meal Prep' },
          { id: 'insights', label: '📊 Insights' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* DIARY TAB */}
        {tab === 'diary' && (
          <View>
            {loadingDate && (
              <View style={styles.loadingRow}>
                <Text style={styles.loadingText}>Loading {dateLabel}…</Text>
              </View>
            )}
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((meal) => {
              const entries = mealEntries(meal);
              const mealCals = entries.reduce((sum, e) => sum + e.calories, 0);
              return (
                <View key={meal} style={styles.mealBlock}>
                  <View style={styles.mealBlockHeader}>
                    <View style={styles.mealBlockLeft}>
                      <Text style={styles.mealEmoji}>{MEAL_LABELS[meal].emoji}</Text>
                      <Text style={styles.mealBlockTitle}>{MEAL_LABELS[meal].label}</Text>
                      {mealCals > 0 && <Text style={styles.mealBlockCals}>{mealCals} kcal</Text>}
                    </View>
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => {
                        setSelectedMeal(meal);
                        setEatTime(MEAL_TIMES[meal]);
                        setTab('search');
                      }}
                    >
                      <Text style={styles.addBtnText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                  {entries.length === 0 ? (
                    <Text style={styles.emptyMeal}>Tap "+ Add" to log food</Text>
                  ) : (
                    entries.map((entry) => {
                      const entryTime = format(new Date(entry.logged_at), 'h:mm a');
                      return (
                        <View key={entry.id} style={styles.foodRow}>
                          <View style={styles.foodInfo}>
                            <Text style={styles.foodName}>{entry.food_item.name}</Text>
                            <Text style={styles.foodMacros}>
                              {entry.quantity_g}g · {entry.calories} kcal · {entryTime}
                              <Text style={styles.foodMacrosSub}>  P:{entry.protein}g  C:{entry.carbs}g  F:{entry.fat}g</Text>
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => removeFood(entry.id)} style={styles.removeBtn}>
                            <Text style={styles.removeBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* SEARCH / LOG FOOD TAB */}
        {tab === 'search' && (
          <View>
            {/* Meal selector */}
            <View style={styles.mealSelector}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.mealChip, selectedMeal === m && styles.mealChipActive]}
                  onPress={() => { setSelectedMeal(m); setEatTime(MEAL_TIMES[m]); }}
                >
                  <Text style={[styles.mealChipText, selectedMeal === m && styles.mealChipTextActive]}>
                    {MEAL_LABELS[m].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time picker */}
            <Text style={styles.timePickerLabel}>⏰ What time did you eat?</Text>
            <TimePicker value={eatTime} onChange={setEatTime} />

            {/* Logging for which date */}
            {!isToday && (
              <View style={styles.pastDateBanner}>
                <Text style={styles.pastDateText}>📅 Logging food for: {dateLabel}</Text>
              </View>
            )}

            {/* Search box */}
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search food (e.g. idli, chicken breast…)"
                placeholderTextColor={Colors.textTertiary}
                returnKeyType="search"
                onSubmitEditing={() => handleSearch(searchQuery)}
                autoCorrect={false}
              />
              {isSearching
                ? <Text style={styles.searchingText}>Searching…</Text>
                : searchQuery.length > 0
                  ? <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setSearchError(null); }}>
                      <Text style={styles.clearBtn}>✕</Text>
                    </TouchableOpacity>
                  : null
              }
            </View>
            {searchError && (
              <View style={styles.searchErrBox}>
                <Text style={styles.searchErrText}>{searchError}</Text>
              </View>
            )}

            {/* Selected food detail */}
            {selectedFood && (
              <View style={styles.selectedFoodCard}>
                {selectedFood.image_url && (
                  <Image source={{ uri: selectedFood.image_url }} style={styles.selectedFoodImage} />
                )}
                <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                {selectedFood.brand && <Text style={styles.selectedFoodBrand}>{selectedFood.brand}</Text>}
                <View style={styles.quantityRow}>
                  <Text style={styles.quantityLabel}>Quantity (grams)</Text>
                  <TextInput
                    style={styles.quantityInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                  />
                </View>
                {(() => {
                  const n = calculateNutrients(selectedFood, parseFloat(quantity) || 100);
                  return (
                    <View style={styles.nutrientChips}>
                      {[
                        { label: `${n.calories} kcal`, color: Colors.primary },
                        { label: `${n.protein}g P`, color: Colors.accent },
                        { label: `${n.carbs}g C`, color: Colors.secondary },
                        { label: `${n.fat}g F`, color: '#A55EEA' },
                      ].map((c) => (
                        <View key={c.label} style={[styles.nutrientChip, { backgroundColor: `${c.color}15` }]}>
                          <Text style={[styles.nutrientChipText, { color: c.color }]}>{c.label}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })()}
                <TouchableOpacity style={styles.logBtn} onPress={handleLogFood}>
                  <Text style={styles.logBtnText}>Add to {MEAL_LABELS[selectedMeal].label} at {eatTime}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Results */}
            {isSearching && searchResults.length === 0 && (
              <View style={styles.searchingBox}>
                <Text style={styles.searchingBoxText}>🔍  Searching USDA + Open Food Facts…</Text>
              </View>
            )}
            {searchResults.map((food, i) => (
              <TouchableOpacity
                key={food.id ?? i}
                style={[styles.resultRow, selectedFood?.id === food.id && styles.resultRowSelected]}
                onPress={() => { setSelectedFood(food); setQuantity('100'); }}
              >
                {food.image_url ? (
                  <Image source={{ uri: food.image_url }} style={styles.resultThumb} />
                ) : (
                  <View style={styles.resultThumbPlaceholder}>
                    <Text style={styles.resultThumbEmoji}>🍽️</Text>
                  </View>
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName} numberOfLines={2}>{food.name}</Text>
                  {food.brand
                    ? <Text style={styles.resultBrand}>{food.brand}</Text>
                    : <Text style={styles.resultSource}>{food.source}</Text>
                  }
                  <Text style={styles.resultMacroLine}>
                    P {food.protein_per_100g}g · C {food.carbs_per_100g}g · F {food.fat_per_100g}g per 100g
                  </Text>
                </View>
                <View style={styles.resultMacros}>
                  <Text style={styles.resultCal}>{food.calories_per_100g}</Text>
                  <Text style={styles.resultCalLabel}>kcal/100g</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* MEAL PREP TAB */}
        {tab === 'mealprep' && (
          <View>
            <Text style={styles.mealPrepHeading}>South Indian Meal Ideas</Text>
            <Text style={styles.mealPrepSub}>High-protein meals optimized for your fat loss goals.</Text>
            {MEAL_SUGGESTIONS.map((meal, i) => (
              <View key={i} style={styles.mealSuggCard}>
                <View style={styles.mealSuggHeader}>
                  <Text style={styles.mealSuggName}>{meal.name}</Text>
                  <View style={styles.mealSuggBadgeRow}>
                    {meal.is_south_indian && (
                      <View style={styles.siChip}><Text style={styles.siChipText}>South Indian</Text></View>
                    )}
                    <View style={styles.typeChip}><Text style={styles.typeChipText}>{meal.meal_type}</Text></View>
                  </View>
                </View>
                <Text style={styles.mealSuggDesc}>{meal.description}</Text>
                <View style={styles.mealSuggMacros}>
                  <Text style={[styles.macroTag, { backgroundColor: `${Colors.primary}12`, color: Colors.primary }]}>{meal.calories} kcal</Text>
                  <Text style={[styles.macroTag, { backgroundColor: `${Colors.accent}12`, color: Colors.accent }]}>{meal.protein}g P</Text>
                  <Text style={[styles.macroTag, { backgroundColor: `${Colors.secondary}12`, color: Colors.secondary }]}>{meal.carbs}g C</Text>
                  <Text style={[styles.macroTag, { backgroundColor: '#A55EEA22', color: '#A55EEA' }]}>{meal.fat}g F</Text>
                  <Text style={styles.mealPrepTime}>⏱ {meal.prep_time_min}m</Text>
                </View>
                <View style={styles.ingredientList}>
                  {meal.ingredients.slice(0, 5).map((ing, j) => (
                    <Text key={j} style={styles.ingredient}>• {ing}</Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* INSIGHTS TAB */}
        {tab === 'insights' && <EatingInsights history={history} />}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xs, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  dateNavBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  dateNavBtnDisabled: { opacity: 0.3 },
  dateNavArrow: { fontSize: 28, color: Colors.primary, fontWeight: '300' },
  dateNavArrowDisabled: { color: Colors.textTertiary },
  dateCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  dateLabel: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', marginTop: 1 },

  calCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.small },
  calLeft: { flex: 1 },
  calLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  calRow: { flexDirection: 'row', alignItems: 'baseline' },
  calConsumed: { fontSize: 36, fontWeight: '900', color: Colors.textPrimary },
  calDivider: { fontSize: FontSize.md, color: Colors.textTertiary },
  calGoal: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary },
  calRemaining: { fontSize: FontSize.sm, fontWeight: '600', marginTop: 4 },
  calRemainingGood: { color: Colors.done },
  calRemainingOver: { color: Colors.error },

  macroCard: { backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.small },
  macroRow: { marginBottom: 10 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  macroValues: {},
  macroVal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  macroGoal: { fontSize: FontSize.sm, color: Colors.textTertiary },
  macroTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  macroFill: { height: 6, borderRadius: 3 },

  tabBar: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: `${Colors.primary}12`, borderColor: Colors.primary },
  tabBtnText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  tabBtnTextActive: { color: Colors.primary },

  content: { flex: 1, paddingHorizontal: Spacing.md },

  loadingRow: { padding: Spacing.md, alignItems: 'center' },
  loadingText: { fontSize: FontSize.sm, color: Colors.textTertiary, fontStyle: 'italic' },

  mealBlock: { marginBottom: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadow.small },
  mealBlockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  mealBlockLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  mealEmoji: { fontSize: 18 },
  mealBlockTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  mealBlockCals: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: '600', backgroundColor: Colors.background, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  addBtn: { backgroundColor: `${Colors.primary}15`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full },
  addBtnText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' },
  emptyMeal: { fontSize: FontSize.sm, color: Colors.textTertiary, fontStyle: 'italic', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  foodInfo: { flex: 1 },
  foodName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  foodMacros: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  foodMacrosSub: { color: Colors.textTertiary },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 14, color: Colors.textTertiary },

  // Search tab
  timePickerLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
  pastDateBanner: { backgroundColor: `${Colors.primary}10`, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: `${Colors.primary}25` },
  pastDateText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },

  mealSelector: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  mealChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  mealChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  mealChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  mealChipTextActive: { color: '#fff' },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.xs },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, paddingVertical: 6 },
  searchingText: { fontSize: FontSize.sm, color: Colors.textTertiary },

  selectedFoodCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.small, borderWidth: 1, borderColor: `${Colors.primary}30` },
  selectedFoodName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  selectedFoodBrand: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  quantityLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  quantityInput: { backgroundColor: Colors.background, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border, width: 80, textAlign: 'center', fontSize: FontSize.md, color: Colors.textPrimary },
  nutrientChips: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginBottom: Spacing.sm },
  nutrientChip: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  nutrientChipText: { fontSize: FontSize.xs, fontWeight: '700' },
  logBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },

  resultRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: 4, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  resultRowSelected: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}08` },
  resultThumb: { width: 44, height: 44, borderRadius: BorderRadius.sm, backgroundColor: Colors.border },
  resultThumbPlaceholder: { width: 44, height: 44, borderRadius: BorderRadius.sm, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  resultThumbEmoji: { fontSize: 20 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  resultBrand: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  resultSource: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2, fontStyle: 'italic' },
  resultMacroLine: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  resultMacros: { alignItems: 'flex-end' },
  resultCal: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary },
  resultCalLabel: { fontSize: 10, color: Colors.textTertiary },
  searchingBox: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 6 },
  searchingBoxText: { fontSize: FontSize.sm, color: Colors.textTertiary, fontStyle: 'italic' },
  clearBtn: { fontSize: 16, color: Colors.textTertiary, paddingHorizontal: 4 },
  searchErrBox: { backgroundColor: `${Colors.error}10`, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: `${Colors.error}25` },
  searchErrText: { fontSize: FontSize.sm, color: Colors.error },
  noResults: { alignItems: 'center', paddingVertical: Spacing.xl },
  noResultsText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
  noResultsSub: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 4 },
  selectedFoodImage: { width: '100%', height: 120, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, resizeMode: 'contain', backgroundColor: Colors.border },

  // Meal prep
  mealPrepHeading: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  mealPrepSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  mealSuggCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.small },
  mealSuggHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  mealSuggName: { flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginRight: Spacing.sm },
  mealSuggBadgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  siChip: { backgroundColor: `${Colors.secondary}15`, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  siChipText: { fontSize: 10, color: Colors.secondary, fontWeight: '700' },
  typeChip: { backgroundColor: Colors.background, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  typeChipText: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600', textTransform: 'capitalize' },
  mealSuggDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 20 },
  mealSuggMacros: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: Spacing.sm },
  macroTag: { fontSize: FontSize.xs, fontWeight: '700', borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  mealPrepTime: { fontSize: FontSize.xs, color: Colors.textTertiary, marginLeft: 'auto' },
  ingredientList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  ingredient: { fontSize: FontSize.xs, color: Colors.textSecondary },

  bottomPad: { height: Spacing.xxl },
});
