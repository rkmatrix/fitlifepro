import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/shared/Card';
import { Button } from '../../components/shared/Button';
import { useHealthStore } from '../../stores/healthStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useUserStore } from '../../stores/userStore';

const HEATMAP_WEEKS = 16;

function WorkoutHeatmap({ logs }: { logs: { date: string; status: string }[] }) {
  const today = new Date();
  const startDate = subDays(today, HEATMAP_WEEKS * 7 - 1);
  const days = eachDayOfInterval({ start: startDate, end: today });

  const logMap = logs.reduce((acc, l) => {
    acc[l.date] = l.status;
    return acc;
  }, {} as Record<string, string>);

  const getColor = (status?: string) => {
    if (!status || status === 'pending') return Colors.border;
    if (status === 'done') return Colors.done;
    if (status === 'partial') return Colors.partial;
    if (status === 'skipped') return Colors.skipped;
    return Colors.border;
  };

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={heatStyles.grid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={heatStyles.week}>
            {week.map((day, di) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              return (
                <View
                  key={di}
                  style={[heatStyles.cell, { backgroundColor: getColor(logMap[dateStr]) }]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const heatStyles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 3 },
  week: { flexDirection: 'column', gap: 3 },
  cell: { width: 12, height: 12, borderRadius: 2 },
});

export default function ProgressScreen() {
  const { profile } = useUserStore();
  const { bodyMetrics, latestBodyMetrics, loadBodyMetrics, logBodyMetrics } = useHealthStore();
  const { logs, loadLogs } = useWorkoutStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWaist, setNewWaist] = useState('');

  useEffect(() => {
    if (!profile) return;
    loadBodyMetrics(profile.id);
    loadLogs(profile.id, 120);
  }, [profile]);

  const handleLogMetrics = async () => {
    if (!profile || !newWeight) return;
    const weight = parseFloat(newWeight);
    const waist = newWaist ? parseFloat(newWaist) : undefined;
    const bmi = weight / Math.pow(profile.height_cm / 100, 2);

    await logBodyMetrics(profile.id, {
      date: format(new Date(), 'yyyy-MM-dd'),
      weight_kg: weight,
      waist_cm: waist,
      bmi: Math.round(bmi * 10) / 10,
    });
    setModalVisible(false);
    setNewWeight('');
    setNewWaist('');
  };

  const startWeight = profile?.weight_kg ?? 0;
  const currentWeight = latestBodyMetrics?.weight_kg ?? startWeight;
  const weightLost = Math.round((startWeight - currentWeight) * 10) / 10;
  const bmi = latestBodyMetrics?.bmi ?? (profile ? Math.round(profile.weight_kg / Math.pow(profile.height_cm / 100, 2) * 10) / 10 : 0);

  const completedCount = logs.filter((l) => ['done', 'partial', 'makeup'].includes(l.status)).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Button title="Log Metrics" onPress={() => setModalVisible(true)} size="sm" />
        </View>

        {/* Stats overview */}
        <Card elevated style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentWeight.toFixed(1)}</Text>
              <Text style={styles.statLabel}>kg now</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: weightLost >= 0 ? Colors.done : Colors.skipped }]}>
                {weightLost >= 0 ? '-' : '+'}{Math.abs(weightLost)}
              </Text>
              <Text style={styles.statLabel}>kg lost</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{bmi}</Text>
              <Text style={styles.statLabel}>BMI</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{latestBodyMetrics?.waist_cm ?? '—'}</Text>
              <Text style={styles.statLabel}>waist cm</Text>
            </View>
          </View>
        </Card>

        {/* Weight trend */}
        {bodyMetrics.length >= 2 && (
          <Card style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Weight Trend</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.trendChart}>
                {bodyMetrics.slice(0, 30).reverse().map((m, i) => {
                  const h = Math.max(4, Math.min(80, ((m.weight_kg - Math.min(...bodyMetrics.map((b) => b.weight_kg))) / (Math.max(...bodyMetrics.map((b) => b.weight_kg)) - Math.min(...bodyMetrics.map((b) => b.weight_kg)) + 0.1)) * 80));
                  return (
                    <View key={i} style={styles.trendBarContainer}>
                      <Text style={styles.trendBarValue}>{m.weight_kg.toFixed(1)}</Text>
                      <View style={[styles.trendBar, { height: h }]} />
                      <Text style={styles.trendBarDate}>{format(parseISO(m.date), 'M/d')}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </Card>
        )}

        {/* Workout Heatmap */}
        <Card style={styles.heatmapCard}>
          <Text style={styles.sectionTitle}>Workout Consistency — {HEATMAP_WEEKS} Weeks</Text>
          <WorkoutHeatmap logs={logs} />
          <Text style={styles.heatmapCaption}>{completedCount} sessions completed total</Text>
        </Card>

        {/* Phase milestones */}
        {profile && (
          <Card style={styles.milestonesCard}>
            <Text style={styles.sectionTitle}>Phase Milestones</Text>
            {[
              { week: 4, title: 'Phase 1 Complete', desc: 'Foundation built. Form is solid.' },
              { week: 8, title: 'Phase 2 Complete', desc: 'Strength increasing. Fat mobilizing.' },
              { week: 16, title: 'Phase 3 Complete', desc: 'Hypertrophy peak. Visible changes.' },
              { week: 24, title: 'Transformation', desc: 'Lifestyle locked in. This is who you are.' },
            ].map((m, i) => {
              const achieved = (profile.week_number ?? 1) > m.week;
              const current = (profile.week_number ?? 1) === m.week;
              return (
                <View key={i} style={[styles.milestoneRow, achieved && styles.milestoneAchieved]}>
                  <Text style={[styles.milestoneDot, achieved && styles.milestoneDotAchieved]}>
                    {achieved ? '✅' : current ? '⭐' : '⬜'}
                  </Text>
                  <View style={styles.milestoneInfo}>
                    <Text style={[styles.milestoneTitle, achieved && styles.milestoneTitleAchieved]}>
                      Week {m.week}: {m.title}
                    </Text>
                    <Text style={styles.milestoneDesc}>{m.desc}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Log metrics modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Today's Metrics</Text>
            <Text style={styles.modalLabel}>Weight (kg) *</Text>
            <TextInput
              style={styles.modalInput}
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="decimal-pad"
              placeholder={currentWeight.toString()}
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.modalLabel}>Waist (cm)</Text>
            <TextInput
              style={styles.modalInput}
              value={newWaist}
              onChangeText={setNewWaist}
              keyboardType="decimal-pad"
              placeholder={latestBodyMetrics?.waist_cm?.toString() ?? 'optional'}
              placeholderTextColor={Colors.textTertiary}
            />
            <View style={styles.modalBtns}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} variant="ghost" size="md" style={styles.modalBtn} />
              <Button title="Save" onPress={handleLogMetrics} size="md" style={styles.modalBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  statsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  chartCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', marginBottom: Spacing.md, letterSpacing: 0.5, textTransform: 'uppercase' },
  trendChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 120, paddingBottom: Spacing.lg },
  trendBarContainer: { alignItems: 'center', gap: 2 },
  trendBarValue: { fontSize: FontSize.xs - 1, color: Colors.textTertiary },
  trendBar: { width: 24, backgroundColor: Colors.primary, borderRadius: 4, opacity: 0.8 },
  trendBarDate: { fontSize: FontSize.xs - 1, color: Colors.textTertiary },
  heatmapCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  heatmapCaption: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.sm },
  milestonesCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  milestoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  milestoneAchieved: { opacity: 1 },
  milestoneDot: { fontSize: 18 },
  milestoneDotAchieved: {},
  milestoneInfo: { flex: 1 },
  milestoneTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  milestoneTitleAchieved: { color: Colors.done },
  milestoneDesc: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  bottomPad: { height: Spacing.xxl },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surfaceElevated, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  modalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  modalInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm },
  modalBtn: { flex: 1 },
});
