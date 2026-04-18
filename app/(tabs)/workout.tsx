import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, subDays, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { StatusBadge } from '../../components/shared/Badges';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useUserStore } from '../../stores/userStore';
import { useNutritionStore } from '../../stores/nutritionStore';
import { useHealthStore } from '../../stores/healthStore';
import { WORKOUT_PLAN } from '../../constants/workoutPlan';
import { WorkoutDay, WorkoutLog } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_W = 60;
const CELL_GAP = 8;
const PAST_DAYS = 90;
const FUTURE_DAYS = 30;
const TOTAL_DAYS = PAST_DAYS + FUTURE_DAYS + 1;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Build full date range once
const TODAY = new Date();
const ALL_DATES: Date[] = Array.from({ length: TOTAL_DAYS }, (_, i) =>
  addDays(subDays(TODAY, PAST_DAYS), i)
);
const TODAY_INDEX = PAST_DAYS;

function getWorkoutsForPhase(phase: number): WorkoutDay[] {
  return WORKOUT_PLAN.phases.find((p) => p.phase_number === phase)?.days ?? [];
}

/** Given a scroll offset + the actual container width, determine which week range is visible */
function weekLabelFromOffset(offset: number, containerW: number): string {
  const cellWidth = CELL_W + CELL_GAP;
  const centerIndex = Math.round((offset + containerW / 2) / cellWidth);
  const clampedIndex = Math.max(0, Math.min(TOTAL_DAYS - 1, centerIndex));
  const centerDate = ALL_DATES[clampedIndex] ?? TODAY;
  const weekS = startOfWeek(centerDate, { weekStartsOn: 0 });
  const weekE = endOfWeek(centerDate, { weekStartsOn: 0 });
  return `${format(weekS, 'MMM d')} – ${format(weekE, 'MMM d')}`;
}

export default function WorkoutScreen() {
  const { profile } = useUserStore();
  const { logs, loadLogs, markWorkout } = useWorkoutStore();
  const { today: nutrition } = useNutritionStore();
  const { todaySleep, todayHealth } = useHealthStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stripWidth, setStripWidth] = useState(0);
  const [weekLabel, setWeekLabel] = useState(() => {
    const weekS = startOfWeek(TODAY, { weekStartsOn: 0 });
    const weekE = endOfWeek(TODAY, { weekStartsOn: 0 });
    return `${format(weekS, 'MMM d')} \u2013 ${format(weekE, 'MMM d')}`;
  });
  const scrollRef = useRef<ScrollView>(null);
  const didScrollRef = useRef(false);
  const selectedIndexRef = useRef(TODAY_INDEX);

  useEffect(() => {
    if (profile) loadLogs(profile.id, 90);
  }, [profile]);

  // Scroll to today once the strip's actual width is known from onLayout
  useEffect(() => {
    if (stripWidth <= 0 || didScrollRef.current) return;
    const cellWidth = CELL_W + CELL_GAP;
    const x = Math.max(0, TODAY_INDEX * cellWidth - stripWidth / 2 + CELL_W / 2);
    scrollRef.current?.scrollTo({ x, animated: false });
    setWeekLabel(weekLabelFromOffset(x, stripWidth));
    didScrollRef.current = true;
  }, [stripWidth]);

  const workouts = profile ? getWorkoutsForPhase(profile.phase) : [];

  const getLogForDate = (date: Date): WorkoutLog | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return logs.find((l) => l.date === dateStr) ?? null;
  };

  const getWorkoutForDay = (dayOfWeek: number): WorkoutDay | null =>
    workouts.find((w) => w.day_of_week === dayOfWeek) ?? null;

  const selectedDayWorkout = getWorkoutForDay(selectedDate.getDay());
  const selectedLog = getLogForDate(selectedDate);

  const handleMark = async (status: 'done' | 'partial' | 'skipped') => {
    if (!profile || !selectedDayWorkout) return;
    await markWorkout(status, profile.id, selectedDayWorkout.id);
  };

  const handleScroll = useCallback((e: any) => {
    const offset = e.nativeEvent.contentOffset.x;
    const w = stripWidth > 0 ? stripWidth : SCREEN_WIDTH;
    setWeekLabel(weekLabelFromOffset(offset, w));
  }, [stripWidth]);

  const handleScrollEnd = useCallback((e: any) => {
    const offset = e.nativeEvent.contentOffset.x;
    const w = stripWidth > 0 ? stripWidth : SCREEN_WIDTH;
    const cellWidth = CELL_W + CELL_GAP;
    const centerIndex = Math.round((offset + w / 2) / cellWidth);
    const clamped = Math.max(0, Math.min(TOTAL_DAYS - 1, centerIndex));
    selectedIndexRef.current = clamped;
    setSelectedDate(ALL_DATES[clamped]);
    setWeekLabel(weekLabelFromOffset(offset, w));
  }, [stripWidth]);

  const handleArrow = useCallback((dir: -1 | 1) => {
    const newIdx = Math.max(0, Math.min(TOTAL_DAYS - 1, selectedIndexRef.current + dir));
    selectedIndexRef.current = newIdx;
    setSelectedDate(ALL_DATES[newIdx]);
    const w = stripWidth > 0 ? stripWidth : SCREEN_WIDTH;
    const cellWidth = CELL_W + CELL_GAP;
    const x = Math.max(0, newIdx * cellWidth - w / 2 + CELL_W / 2);
    scrollRef.current?.scrollTo({ x, animated: true });
    setWeekLabel(weekLabelFromOffset(x, w));
  }, [stripWidth]);

  // Build calendar data from logs
  const calendarData: DayData[] = logs.map((log) => {
    const dow = new Date(log.date + 'T12:00:00').getDay();
    const workout = getWorkoutForDay(dow);
    return {
      date: log.date,
      workoutStatus: log.status as 'done' | 'partial' | 'skipped',
      workoutName: workout?.name,
      workoutFocus: workout?.focus,
      calories: nutrition.calories,
      sleepHours: todaySleep ? Math.round(todaySleep.duration_min / 60 * 10) / 10 : undefined,
      steps: todayHealth?.steps,
      waterMl: nutrition.water_ml,
    };
  });

  const statusColor = (s?: string) => {
    if (s === 'done') return Colors.done;
    if (s === 'partial') return Colors.partial;
    if (s === 'skipped') return Colors.skipped;
    return Colors.border;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Training</Text>
            {profile && <Text style={styles.subtitle}>Phase {profile.phase} · Week {profile.week_number}</Text>}
          </View>
        </View>

        {/* Week range label with navigation arrows */}
        <View style={styles.weekLabelRow}>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => handleArrow(-1)}>
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.weekRangeLabel}>{weekLabel}</Text>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => handleArrow(1)}>
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable date strip */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => { const w = e.nativeEvent.layout.width; if (w > 0) setStripWidth(w); }}
          style={styles.dayStrip}
          contentContainerStyle={styles.dayStripContent}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={32}
          decelerationRate="fast"
          snapToInterval={CELL_W + CELL_GAP}
          snapToAlignment="center"
        >
          {ALL_DATES.map((day, idx) => {
            const dayLog = getLogForDate(day);
            const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isToday = format(day, 'yyyy-MM-dd') === format(TODAY, 'yyyy-MM-dd');
            const hasWorkout = getWorkoutForDay(day.getDay()) !== null;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayTextSelected, isToday && !isSelected && styles.dayNameToday]}>
                  {DAY_LABELS[day.getDay()]}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayTextSelected, isToday && !isSelected && styles.dayNumToday]}>
                  {format(day, 'd')}
                </Text>
                <Text style={[styles.dayMonth, isSelected && styles.dayTextSelected]}>
                  {format(day, 'MMM')}
                </Text>
                {hasWorkout && (
                  <View style={[styles.dayDot, { backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : statusColor(dayLog?.status) }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected day detail */}
        <View style={styles.section}>
          {selectedDayWorkout ? (
            <View style={styles.workoutCard}>
              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workoutName}>{selectedDayWorkout.name}</Text>
                  <Text style={styles.workoutFocus}>{selectedDayWorkout.focus}</Text>
                </View>
                {selectedLog && (
                  <StatusBadge status={selectedLog.status as 'done' | 'partial' | 'skipped' | 'pending'} />
                )}
              </View>

              {/* Duration chips */}
              <View style={styles.durationRow}>
                <View style={styles.durationChip}>
                  <Text style={styles.durationIcon}>⏱</Text>
                  <Text style={styles.durationText}>{selectedDayWorkout.full_duration_min}m full</Text>
                </View>
                <View style={styles.durationChip}>
                  <Text style={styles.durationIcon}>⚡</Text>
                  <Text style={styles.durationText}>{selectedDayWorkout.express_duration_min}m express</Text>
                </View>
              </View>

              {selectedDayWorkout.notes && (
                <View style={styles.coachNote}>
                  <Text style={styles.coachNoteText}>"{selectedDayWorkout.notes}"</Text>
                </View>
              )}

              {/* Exercise list */}
              <Text style={styles.exercisesLabel}>Exercises</Text>
              {selectedDayWorkout.exercises.map((ex, i) => {
                const muscleColor = (Colors as any)[ex.exercise.muscle_group] ?? Colors.primary;
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.exerciseRow}
                    onPress={() => router.push(`/workout/${ex.exercise.id}`)}
                  >
                    <View style={[styles.exerciseNum, { backgroundColor: `${muscleColor}18` }]}>
                      <Text style={[styles.exerciseNumText, { color: muscleColor }]}>{i + 1}</Text>
                    </View>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{ex.exercise.name}</Text>
                      <Text style={styles.exerciseSets}>
                        {ex.sets} × {ex.exercise.default_duration_sec ? `${ex.exercise.default_duration_sec}s` : `${ex.reps} reps`}
                        {' · '}{ex.rest_sec}s rest
                      </Text>
                    </View>
                    <View style={styles.exercisePlay}>
                      <Text style={styles.exercisePlayText}>▶</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Action */}
              <View style={styles.actionRow}>
                {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? (
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => router.push(`/workout/session/${selectedDayWorkout.id}?variant=full`)}
                  >
                    <Text style={styles.startBtnText}>Start Workout</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.markRow}>
                    {(['done', 'partial', 'skipped'] as const).map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.markBtn, selectedLog?.status === s && styles.markBtnActive(s)]}
                        onPress={() => handleMark(s)}
                      >
                        <Text style={[styles.markBtnText, selectedLog?.status === s && styles.markBtnTextActive]}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.restCard}>
              <Text style={styles.restEmoji}>🌿</Text>
              <View>
                <Text style={styles.restTitle}>Rest & Recovery</Text>
                <Text style={styles.restText}>Active recovery, gentle stretching, or a walk.</Text>
              </View>
            </View>
          )}
        </View>

        {/* Phase overview */}
        {profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Journey</Text>
            {WORKOUT_PLAN.phases.map((phase) => (
              <View
                key={phase.phase_number}
                style={[styles.phaseRow, profile.phase === phase.phase_number && styles.phaseRowActive]}
              >
                <View style={[styles.phaseCircle, profile.phase >= phase.phase_number && styles.phaseCircleActive]}>
                  <Text style={[styles.phaseCircleNum, profile.phase >= phase.phase_number && styles.phaseCircleNumActive]}>
                    {phase.phase_number}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.phaseName}>{phase.name}</Text>
                  <Text style={styles.phaseWeeks}>Weeks {phase.weeks_start}–{phase.weeks_end}</Text>
                </View>
                {profile.phase === phase.phase_number && (
                  <View style={styles.currentPhaseBadge}><Text style={styles.currentPhaseBadgeText}>Current</Text></View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', marginTop: 2 },


  weekLabelRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs, gap: Spacing.sm },
  weekRangeLabel: { flex: 1, textAlign: 'center', fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  arrowBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  arrowText: { fontSize: 22, color: Colors.primary, fontWeight: '700', lineHeight: 26, textAlign: 'center' },

  dayStrip: { flexGrow: 0 },
  dayStripContent: { paddingHorizontal: Spacing.md, gap: CELL_GAP, paddingBottom: Spacing.md },
  dayCell: {
    alignItems: 'center', paddingVertical: 10, width: CELL_W,
    borderRadius: BorderRadius.lg, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  dayCellSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayCellToday: { borderColor: Colors.primary },
  dayName: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary },
  dayNameToday: { color: Colors.primary },
  dayNum: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  dayNumToday: { color: Colors.primary },
  dayMonth: { fontSize: 9, color: Colors.textTertiary, fontWeight: '500', marginTop: 1 },
  dayTextSelected: { color: '#fff' },
  dayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 4 },

  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },

  workoutCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.small },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  workoutName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  workoutFocus: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  durationRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  durationChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  durationIcon: { fontSize: 12 },
  durationText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },

  coachNote: { borderLeftWidth: 2, borderLeftColor: Colors.primary, paddingLeft: Spacing.sm, marginBottom: Spacing.md },
  coachNoteText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic' },

  exercisesLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  exerciseNum: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  exerciseNumText: { fontSize: FontSize.sm, fontWeight: '800' },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  exerciseSets: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  exercisePlay: { width: 30, height: 30, borderRadius: 15, backgroundColor: `${Colors.primary}15`, justifyContent: 'center', alignItems: 'center' },
  exercisePlayText: { fontSize: 11, color: Colors.primary },

  actionRow: { marginTop: Spacing.md },
  startBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  markRow: { flexDirection: 'row', gap: Spacing.sm },
  markBtn: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surface },
  markBtnActive: (s: string) => ({
    backgroundColor: s === 'done' ? `${Colors.done}15` : s === 'partial' ? `${Colors.partial}15` : `${Colors.skipped}15`,
    borderColor: s === 'done' ? Colors.done : s === 'partial' ? Colors.partial : Colors.skipped,
  }),
  markBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  markBtnTextActive: { color: Colors.textPrimary },

  restCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.small },
  restEmoji: { fontSize: 36 },
  restTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  restText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  phaseRowActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}08` },
  phaseCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  phaseCircleActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  phaseCircleNum: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.textTertiary },
  phaseCircleNumActive: { color: Colors.primary },
  phaseName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  phaseWeeks: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  currentPhaseBadge: { backgroundColor: `${Colors.primary}15`, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  currentPhaseBadgeText: { fontSize: 10, color: Colors.primary, fontWeight: '700' },

  bottomPad: { height: Spacing.xxl },
});
