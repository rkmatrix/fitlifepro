import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { Ring } from '../../components/shared/Ring';
import { useUserStore } from '../../stores/userStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useNutritionStore } from '../../stores/nutritionStore';
import { useHealthStore } from '../../stores/healthStore';
import { WORKOUT_PLAN } from '../../constants/workoutPlan';
import { resolveWorkoutSchedule } from '../../engines/smartScheduler';
import { getProactiveInsight } from '../../lib/openai';
import {
  DEFAULT_CALORIE_TARGET, DEFAULT_PROTEIN_TARGET,
  DEFAULT_CARB_TARGET, DEFAULT_FAT_TARGET,
  DAILY_STEP_TARGET, DAILY_WATER_ML_TARGET, SLEEP_TARGET_MIN,
} from '../../constants/config';
import { WorkoutDay, WorkoutVariant } from '../../types';

const { width } = Dimensions.get('window');

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDayWorkout(phase: number, dayOfWeek: number): WorkoutDay | null {
  const phaseData = WORKOUT_PLAN.phases.find((p) => p.phase_number === phase);
  if (!phaseData) return null;
  return phaseData.days.find((d) => d.day_of_week === dayOfWeek) ?? null;
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = Math.min(1, value / goal);
  return (
    <View style={macroBarStyles.row}>
      <View style={macroBarStyles.labelRow}>
        <Text style={macroBarStyles.label}>{label}</Text>
        <Text style={macroBarStyles.values}>{Math.round(value)}g <Text style={macroBarStyles.goal}>/ {goal}g</Text></Text>
      </View>
      <View style={macroBarStyles.track}>
        <View style={[macroBarStyles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const macroBarStyles = StyleSheet.create({
  row: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  values: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  goal: { fontWeight: '400', color: Colors.textTertiary },
  track: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});

export default function TodayScreen() {
  const { profile } = useUserStore();
  const { todayLog, streak, loadTodayLog, calculateStreak, calendarConflict, setCalendarConflict } = useWorkoutStore();
  const { today: nutrition, loadToday: loadNutrition, updateWater } = useNutritionStore();
  const { todaySleep, todayHealth, loadTodaySleep, loadHealthMetrics } = useHealthStore();

  const [workoutVariant, setWorkoutVariant] = useState<WorkoutVariant>('full');
  const [scheduleRec, setScheduleRec] = useState<string>('');
  const [trainerTip, setTrainerTip] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(0);

  // Sync glass count from stored water data
  useEffect(() => {
    setWaterGlasses(Math.round(nutrition.water_ml / 250));
  }, [nutrition.water_ml]);

  const todayWorkout = profile
    ? getDayWorkout(profile.phase, new Date().getDay())
    : null;

  const loadAll = useCallback(async () => {
    if (!profile) return;
    await Promise.all([
      loadTodayLog(profile.id),
      loadNutrition(profile.id),
      loadTodaySleep(profile.id),
      loadHealthMetrics(profile.id),
      calculateStreak(profile.id),
    ]);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!profile || !todayWorkout) return;
    (async () => {
      const result = await resolveWorkoutSchedule(todayWorkout, profile.preferred_workout_time);
      setWorkoutVariant(result.variant);
      setScheduleRec(result.recommendation);
      setCalendarConflict(result.conflict);
    })();
  }, [profile, todayWorkout]);

  useEffect(() => {
    if (!profile) return;
    const tip = getProactiveInsight({
      userProfile: { name: profile.name, age: profile.age, phase: profile.phase, weekNumber: profile.week_number, targetCalories: profile.target_calories },
      workoutStatus: todayLog?.status,
      todayCalories: nutrition.calories,
      todayProtein: nutrition.protein,
      sleepScore: todaySleep?.sleep_score,
      sleepHours: todaySleep ? todaySleep.duration_min / 60 : undefined,
      restingHR: todayHealth?.resting_hr,
      steps: todayHealth?.steps,
      streak,
    });
    setTrainerTip(tip);
  }, [todayLog, nutrition, todaySleep, todayHealth, streak]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleAddWater = async () => {
    if (!profile) return;
    const newGlasses = waterGlasses + 1;
    setWaterGlasses(newGlasses);
    await updateWater(profile.id, newGlasses * 250);
  };

  const caloriesLeft = (profile?.target_calories ?? DEFAULT_CALORIE_TARGET) - nutrition.calories;
  const calPct = Math.min(1, nutrition.calories / (profile?.target_calories ?? DEFAULT_CALORIE_TARGET));
  const calorieTarget = profile?.target_calories ?? DEFAULT_CALORIE_TARGET;
  const workoutDone = todayLog?.status === 'done';
  const sleepHours = todaySleep ? Math.round(todaySleep.duration_min / 60 * 10) / 10 : 0;
  const steps = todayHealth?.steps ?? 0;
  const firstName = profile?.name.split(' ')[0] ?? 'Champion';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <View style={styles.streakPill}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakNum}>{streak}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>

        {/* Calories Card (MFP style) */}
        <View style={styles.caloriesCard}>
          <View style={styles.caloriesLeft}>
            <Text style={styles.caloriesTitle}>Calories</Text>
            <Text style={styles.caloriesNum}>{nutrition.calories}</Text>
            <Text style={styles.caloriesSubtitle}>/ {calorieTarget} kcal</Text>
            <View style={[styles.calTag, caloriesLeft >= 0 ? styles.calTagGood : styles.calTagOver]}>
              <Text style={[styles.calTagText, caloriesLeft >= 0 ? styles.calTagTextGood : styles.calTagTextOver]}>
                {caloriesLeft >= 0 ? `${caloriesLeft} left` : `${Math.abs(caloriesLeft)} over`}
              </Text>
            </View>
          </View>
          <Ring
            progress={calPct}
            color={Colors.primary}
            size={96}
            label=""
            centerText={`${Math.round(calPct * 100)}%`}
          />
        </View>

        {/* Macros */}
        <View style={styles.macroCard}>
          <MacroBar label="Carbs" value={nutrition.carbs} goal={DEFAULT_CARB_TARGET} color={Colors.secondary} />
          <MacroBar label="Fat" value={nutrition.fat} goal={DEFAULT_FAT_TARGET} color="#A55EEA" />
          <MacroBar label="Protein" value={nutrition.protein} goal={DEFAULT_PROTEIN_TARGET} color={Colors.accent} />
        </View>

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/health')}>
            <Text style={styles.statIcon}>👣</Text>
            <Text style={styles.statValue}>{steps.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Steps</Text>
            <View style={styles.statBar}>
              <View style={[styles.statBarFill, { width: `${Math.min(1, steps / DAILY_STEP_TARGET) * 100}%`, backgroundColor: Colors.ringSteps }]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(tabs)/health')}>
            <Text style={styles.statIcon}>😴</Text>
            <Text style={styles.statValue}>{sleepHours}h</Text>
            <Text style={styles.statLabel}>Sleep</Text>
            <View style={styles.statBar}>
              <View style={[styles.statBarFill, { width: `${Math.min(1, (todaySleep?.duration_min ?? 0) / SLEEP_TARGET_MIN) * 100}%`, backgroundColor: Colors.ringSleep }]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={handleAddWater}>
            <Text style={styles.statIcon}>💧</Text>
            <Text style={styles.statValue}>{(nutrition.water_ml / 1000).toFixed(1)}L</Text>
            <Text style={styles.statLabel}>Water</Text>
            <View style={styles.statBar}>
              <View style={[styles.statBarFill, { width: `${Math.min(1, nutrition.water_ml / DAILY_WATER_ML_TARGET) * 100}%`, backgroundColor: Colors.ringWater }]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Today's Workout */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Workout</Text>
          {profile && <Text style={styles.sectionBadge}>Phase {profile.phase} · Wk {profile.week_number}</Text>}
        </View>

        {todayWorkout ? (
          <View style={styles.workoutCard}>
            <View style={styles.workoutTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.workoutName}>{todayWorkout.name}</Text>
                <Text style={styles.workoutFocus}>{todayWorkout.focus}</Text>
              </View>
              <View style={[styles.statusDot, workoutDone ? styles.statusDone : styles.statusPending]}>
                <Text style={styles.statusDotText}>{workoutDone ? '✓' : '○'}</Text>
              </View>
            </View>

            {scheduleRec ? (
              <View style={styles.scheduleRec}>
                <Text style={styles.scheduleRecText}>{scheduleRec}</Text>
              </View>
            ) : null}

            <View style={styles.variantRow}>
              {(['full', 'express', 'micro', 'desk'] as WorkoutVariant[]).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.variantChip, workoutVariant === v && styles.variantChipActive]}
                  onPress={() => setWorkoutVariant(v)}
                >
                  <Text style={[styles.variantLabel, workoutVariant === v && styles.variantLabelActive]}>
                    {v === 'full' ? `Full ${todayWorkout.full_duration_min}m` :
                     v === 'express' ? `Express ${todayWorkout.express_duration_min}m` :
                     v === 'micro' ? `Micro ${todayWorkout.micro_duration_min}m` : 'Desk 5m'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {workoutDone ? (
              <View style={styles.workoutDoneBanner}>
                <Text style={styles.workoutDoneText}>✅ Completed today</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => router.push(`/workout/session/${todayWorkout.id}?variant=${workoutVariant}`)}
              >
                <Text style={styles.startBtnText}>Start Workout</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.restCard}>
            <Text style={styles.restEmoji}>🌿</Text>
            <View>
              <Text style={styles.restTitle}>Rest Day</Text>
              <Text style={styles.restText}>Active recovery — walk, stretch, or meal prep.</Text>
            </View>
          </View>
        )}

        {/* Quick Log Food */}
        <TouchableOpacity style={styles.logFoodRow} onPress={() => router.push('/(tabs)/nutrition')}>
          <View style={styles.logFoodLeft}>
            <Text style={styles.logFoodIcon}>🍽️</Text>
            <Text style={styles.logFoodText}>Log Food</Text>
          </View>
          <Text style={styles.logFoodArrow}>›</Text>
        </TouchableOpacity>

        {/* AI Tip */}
        {trainerTip ? (
          <View style={styles.tipCard}>
            <View style={styles.tipBadge}><Text style={styles.tipBadgeText}>AI Coach</Text></View>
            <Text style={styles.tipText}>{trainerTip}</Text>
          </View>
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 4 },
  greeting: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  name: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  streakPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
  streakFire: { fontSize: 16 },
  streakNum: { fontSize: FontSize.md, fontWeight: '800', color: '#FF9F43' },
  dateText: { fontSize: FontSize.sm, color: Colors.textTertiary, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },

  caloriesCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  caloriesLeft: { flex: 1 },
  caloriesTitle: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  caloriesNum: { fontSize: 40, fontWeight: '900', color: Colors.textPrimary, lineHeight: 44 },
  caloriesSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 8 },
  calTag: { alignSelf: 'flex-start', borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  calTagGood: { backgroundColor: '#E8F5E9' },
  calTagOver: { backgroundColor: '#FFEBEE' },
  calTagText: { fontSize: FontSize.xs, fontWeight: '700' },
  calTagTextGood: { color: Colors.done },
  calTagTextOver: { color: Colors.error },

  macroCard: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    ...Shadow.small,
  },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center',
    ...Shadow.small,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600', marginBottom: 6 },
  statBar: { width: '100%', height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  statBarFill: { height: 4, borderRadius: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.xs },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  sectionBadge: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },

  workoutCard: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  workoutTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  workoutName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  workoutFocus: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statusDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statusDone: { backgroundColor: '#E8F5E9' },
  statusPending: { backgroundColor: Colors.border },
  statusDotText: { fontSize: 14, fontWeight: '700', color: Colors.done },
  scheduleRec: { backgroundColor: '#EFF8FF', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.sm },
  scheduleRecText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '500' },
  variantRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md, flexWrap: 'wrap' },
  variantChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  variantChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  variantLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  variantLabelActive: { color: '#fff' },
  startBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  workoutDoneBanner: { backgroundColor: '#E8F5E9', borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  workoutDoneText: { color: Colors.done, fontWeight: '700', fontSize: FontSize.sm },

  restCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  restEmoji: { fontSize: 36 },
  restTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  restText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  logFoodRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 14, marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  logFoodLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logFoodIcon: { fontSize: 20 },
  logFoodText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  logFoodArrow: { fontSize: 22, color: Colors.textTertiary },

  tipCard: {
    backgroundColor: '#EFF8FF', marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  tipBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  tipBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  tipText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  bottomPad: { height: Spacing.xxl },
});
