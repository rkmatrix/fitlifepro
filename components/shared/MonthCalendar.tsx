import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform,
} from 'react-native';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  format, isSameMonth, isSameDay, addMonths, subMonths,
} from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';

export interface DayData {
  date: string;
  workoutStatus?: 'done' | 'partial' | 'skipped' | null;
  workoutName?: string;
  workoutFocus?: string;
  calories?: number;
  protein?: number;
  sleepHours?: number;
  steps?: number;
  waterMl?: number;
  notes?: string;
}

interface MonthCalendarProps {
  data: DayData[];
  onClose: () => void;
}

const statusColor = (s?: 'done' | 'partial' | 'skipped' | null) => {
  if (s === 'done') return Colors.done;
  if (s === 'partial') return Colors.partial;
  if (s === 'skipped') return Colors.skipped;
  return 'transparent';
};

// ─── Day detail bottom-sheet popup ───────────────────────────────────────────
function DayDetailSheet({ day, onClose }: { day: DayData; onClose: () => void }) {
  const dateLabel = format(new Date(day.date + 'T12:00:00'), 'EEEE, MMMM d');
  const dotColor = statusColor(day.workoutStatus);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheetStyles.backdrop}>
        {/* Tap outside to close */}
        <TouchableOpacity style={sheetStyles.dismissArea} onPress={onClose} activeOpacity={1} />
        <View style={sheetStyles.sheet}>
          {/* Handle + header */}
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.sheetHeader}>
            <Text style={sheetStyles.dateLabel}>{dateLabel}</Text>
            <TouchableOpacity onPress={onClose} style={sheetStyles.closeBtn}>
              <Text style={sheetStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={sheetStyles.body}>
            {/* Workout */}
            <View style={sheetStyles.card}>
              <Text style={sheetStyles.cardTitle}>💪 Workout</Text>
              {day.workoutName ? (
                <>
                  <Text style={sheetStyles.cardValue}>{day.workoutName}</Text>
                  {day.workoutFocus && <Text style={sheetStyles.cardSub}>{day.workoutFocus}</Text>}
                  {day.workoutStatus && (
                    <View style={[sheetStyles.statusChip, { backgroundColor: `${dotColor}18` }]}>
                      <Text style={[sheetStyles.statusChipText, { color: dotColor }]}>
                        {day.workoutStatus.charAt(0).toUpperCase() + day.workoutStatus.slice(1)}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={sheetStyles.emptyText}>No workout logged</Text>
              )}
            </View>

            {/* Nutrition */}
            <View style={sheetStyles.card}>
              <Text style={sheetStyles.cardTitle}>🥗 Nutrition</Text>
              {day.calories ? (
                <View style={sheetStyles.statRow}>
                  <View style={sheetStyles.statItem}>
                    <Text style={sheetStyles.statValue}>{day.calories}</Text>
                    <Text style={sheetStyles.statLabel}>kcal</Text>
                  </View>
                  {day.protein ? (
                    <View style={sheetStyles.statItem}>
                      <Text style={sheetStyles.statValue}>{day.protein}g</Text>
                      <Text style={sheetStyles.statLabel}>Protein</Text>
                    </View>
                  ) : null}
                  {day.waterMl ? (
                    <View style={sheetStyles.statItem}>
                      <Text style={sheetStyles.statValue}>{(day.waterMl / 1000).toFixed(1)}L</Text>
                      <Text style={sheetStyles.statLabel}>Water</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={sheetStyles.emptyText}>No nutrition logged</Text>
              )}
            </View>

            {/* Sleep */}
            <View style={sheetStyles.card}>
              <Text style={sheetStyles.cardTitle}>😴 Sleep</Text>
              {day.sleepHours ? (
                <View style={sheetStyles.statRow}>
                  <View style={sheetStyles.statItem}>
                    <Text style={sheetStyles.statValue}>{day.sleepHours}h</Text>
                    <Text style={sheetStyles.statLabel}>Duration</Text>
                  </View>
                </View>
              ) : (
                <Text style={sheetStyles.emptyText}>No sleep data</Text>
              )}
            </View>

            {/* Activity */}
            <View style={sheetStyles.card}>
              <Text style={sheetStyles.cardTitle}>👣 Activity</Text>
              {day.steps ? (
                <View style={sheetStyles.statRow}>
                  <View style={sheetStyles.statItem}>
                    <Text style={sheetStyles.statValue}>{day.steps.toLocaleString()}</Text>
                    <Text style={sheetStyles.statLabel}>Steps</Text>
                  </View>
                </View>
              ) : (
                <Text style={sheetStyles.emptyText}>No activity data</Text>
              )}
            </View>

            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: 10 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dateLabel: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  closeBtnText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '700' },
  body: { padding: Spacing.md },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.small,
  },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm },
  cardValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statusChip: {
    alignSelf: 'flex-start', borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 3, marginTop: Spacing.xs,
  },
  statusChipText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  emptyText: { fontSize: FontSize.sm, color: Colors.textTertiary, fontStyle: 'italic' },
  statRow: { flexDirection: 'row', gap: Spacing.xl },
  statItem: {},
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});

// ─── Main calendar ────────────────────────────────────────────────────────────
export function MonthCalendar({ data, onClose }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const getDay = (date: Date): DayData | undefined =>
    data.find((item) => item.date === format(date, 'yyyy-MM-dd'));

  const today = new Date();

  const handleDayPress = (day: Date) => {
    const dayData = getDay(day);
    setSelectedDay(dayData ?? { date: format(day, 'yyyy-MM-dd') });
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      {/* On web: dark surround + constrain to same 680px column as the rest of the app */}
      <View style={Platform.OS === 'web' ? { flex: 1, backgroundColor: '#0f0f1a' } : { flex: 1 }}>
      <View style={[styles.container, Platform.OS === 'web' && { maxWidth: 680, alignSelf: 'center' as const, width: '100%' } as any]}>
        {/* Header */}
        <View style={[styles.header, Platform.OS === 'web' && { paddingTop: 16 } as any]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity Calendar</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={styles.navBtn}>
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.navBtn}>
            <Text style={styles.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day-of-week labels */}
        <View style={styles.weekLabels}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((l, i) => (
            <Text key={i} style={styles.weekLabel}>{l}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {days.map((day, i) => {
            const dayData = getDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay?.date === format(day, 'yyyy-MM-dd');
            const dotColor = statusColor(dayData?.workoutStatus);

            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayCell, isToday && styles.todayCell, isSelected && styles.selectedCell]}
                onPress={() => handleDayPress(day)}
              >
                <Text style={[
                  styles.dayNum,
                  !isCurrentMonth && styles.dayNumFaded,
                  isToday && styles.todayNum,
                  isSelected && styles.selectedNum,
                ]}>
                  {format(day, 'd')}
                </Text>
                {dotColor !== 'transparent' && isCurrentMonth && (
                  <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: Colors.done, label: 'Done' },
            { color: Colors.partial, label: 'Partial' },
            { color: Colors.skipped, label: 'Skipped' },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.tapHint}>Tap any date to see the day summary</Text>
      </View>
      </View>

      {/* Day detail popup — shown over the calendar */}
      {selectedDay && (
        <DayDetailSheet day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '700' },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface,
  },
  monthTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  navBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  navBtnText: { fontSize: 24, color: Colors.primary, fontWeight: '600' },

  weekLabels: { flexDirection: 'row', paddingHorizontal: 8, backgroundColor: Colors.surface, paddingBottom: Spacing.xs },
  weekLabel: { width: `${100 / 7}%`, textAlign: 'center', fontSize: FontSize.xs, fontWeight: '700', color: Colors.textTertiary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, backgroundColor: Colors.surface, paddingBottom: Spacing.sm },
  dayCell: { width: `${100 / 7}%`, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: BorderRadius.sm },
  todayCell: { backgroundColor: `${Colors.primary}15` },
  selectedCell: { backgroundColor: Colors.primary },
  dayNum: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  dayNumFaded: { color: Colors.textTertiary, opacity: 0.4 },
  todayNum: { color: Colors.primary, fontWeight: '800' },
  selectedNum: { color: '#fff', fontWeight: '800' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },

  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg,
    paddingVertical: Spacing.sm, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },

  tapHint: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: Spacing.md, fontStyle: 'italic' },
});
