import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, subDays } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { Card } from '../../components/shared/Card';
import { useHealthStore } from '../../stores/healthStore';
import { useUserStore } from '../../stores/userStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { SLEEP_TARGET_MIN } from '../../constants/config';
import { SleepLog } from '../../types';
import { IS_DEMO, DEMO_HEALTH } from '../../constants/demo';

// ─── Sleep bar ────────────────────────────────────────────────────────────────
function SleepBar({ log }: { log: SleepLog }) {
  const pct = Math.min(1, log.duration_min / SLEEP_TARGET_MIN);
  const hours = (log.duration_min / 60).toFixed(1);
  const scoreColor = log.sleep_score >= 80 ? Colors.done : log.sleep_score >= 60 ? Colors.partial : Colors.skipped;
  return (
    <View style={barStyles.container}>
      <Text style={barStyles.date}>{format(new Date(log.date), 'EEE')}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.bar, { height: `${pct * 100}%` as any, backgroundColor: scoreColor }]} />
      </View>
      <Text style={barStyles.hours}>{hours}h</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1 },
  date: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4 },
  track: { flex: 1, width: 16, backgroundColor: Colors.border, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 8 },
  hours: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
});

// ─── Health platform config ───────────────────────────────────────────────────
type PlatformKey = 'apple' | 'google' | 'samsung';

interface HealthPlatform {
  key: PlatformKey;
  name: string;
  emoji: string;
  color: string;
  desc: string;
  available: boolean;
  metrics: string[];
}

const HEALTH_PLATFORMS: HealthPlatform[] = [
  {
    key: 'apple',
    name: 'Apple Health',
    emoji: '🍎',
    color: '#FF3B30',
    desc: 'Syncs steps, heart rate, sleep, workouts, and active calories from Apple Watch and iPhone.',
    available: Platform.OS === 'ios',
    metrics: ['Steps', 'Heart Rate', 'HRV', 'Sleep', 'Active Calories', 'Resting HR', 'VO₂ Max'],
  },
  {
    key: 'google',
    name: 'Google Health Connect',
    emoji: '🔵',
    color: '#4285F4',
    desc: 'Syncs data from Google Fit, Garmin, Fitbit, Whoop and other Android health apps.',
    available: Platform.OS === 'android',
    metrics: ['Steps', 'Heart Rate', 'Sleep', 'Active Calories', 'Distance', 'Blood Oxygen'],
  },
  {
    key: 'samsung',
    name: 'Samsung Health',
    emoji: '🌀',
    color: '#1428A0',
    desc: 'Syncs data from Samsung Galaxy Watch, Galaxy Ring and Samsung Health app.',
    available: Platform.OS === 'android',
    metrics: ['Steps', 'Heart Rate', 'HRV', 'Sleep', 'Active Calories', 'Stress Score', 'Body Composition'],
  },
];

// Mock sync delay to simulate connecting
const DEMO_SYNC_METRICS = {
  steps: 6240,
  resting_hr: 62,
  active_calories: 380,
  hrv: 48,
  sleep_hours: 7.1,
  sleep_score: 78,
  stress_score: 32,
  blood_oxygen: 98,
};

// ─── Platform Card ────────────────────────────────────────────────────────────
function PlatformCard({
  platform,
  connected,
  onConnect,
  onDisconnect,
}: {
  platform: HealthPlatform;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <View style={[pStyles.card, connected && pStyles.cardConnected, { borderLeftColor: platform.color, borderLeftWidth: 4 }]}>
      <View style={pStyles.header}>
        <View style={[pStyles.iconWrap, { backgroundColor: `${platform.color}15` }]}>
          <Text style={pStyles.icon}>{platform.emoji}</Text>
        </View>
        <View style={pStyles.info}>
          <Text style={pStyles.name}>{platform.name}</Text>
          <Text style={pStyles.desc}>{platform.desc}</Text>
        </View>
      </View>

      {/* Metrics chips */}
      <View style={pStyles.metrics}>
        {platform.metrics.map((m) => (
          <View key={m} style={[pStyles.chip, connected && { backgroundColor: `${platform.color}12`, borderColor: `${platform.color}30` }]}>
            <Text style={[pStyles.chipText, connected && { color: platform.color }]}>{m}</Text>
          </View>
        ))}
      </View>

      {/* Action row */}
      <View style={pStyles.actionRow}>
        {!platform.available ? (
          <View style={pStyles.unavailableBox}>
            <Text style={pStyles.unavailableText}>
              {Platform.OS === 'web'
                ? '📱 Requires the mobile app (iOS or Android)'
                : platform.key === 'apple'
                ? '🍎 Requires an iOS device'
                : '🤖 Requires an Android device'}
            </Text>
          </View>
        ) : connected ? (
          <View style={pStyles.connectedRow}>
            <View style={pStyles.connectedBadge}>
              <Text style={pStyles.connectedDot}>●</Text>
              <Text style={pStyles.connectedText}>Connected & syncing</Text>
            </View>
            <TouchableOpacity onPress={onDisconnect} style={pStyles.disconnectBtn}>
              <Text style={pStyles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[pStyles.connectBtn, { backgroundColor: platform.color }]}
            onPress={onConnect}
          >
            <Text style={pStyles.connectBtnText}>Connect {platform.name}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const pStyles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.small, borderWidth: 1, borderColor: Colors.border },
  cardConnected: { borderColor: Colors.border },
  header: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  iconWrap: { width: 48, height: 48, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 24 },
  info: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  desc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  chip: { backgroundColor: Colors.background, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  chipText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  actionRow: {},
  unavailableBox: { backgroundColor: Colors.background, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  unavailableText: { fontSize: FontSize.xs, color: Colors.textTertiary, fontStyle: 'italic' },
  connectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  connectedDot: { fontSize: 10, color: Colors.done },
  connectedText: { fontSize: FontSize.sm, color: Colors.done, fontWeight: '600' },
  disconnectBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  disconnectText: { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: '600' },
  connectBtn: { borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  connectBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
});

// ─── Syncing modal ────────────────────────────────────────────────────────────
function SyncingModal({ platformName, color, visible, onDone }: { platformName: string; color: string; visible: boolean; onDone: () => void }) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onDone, 2200);
      return () => clearTimeout(t);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={syncStyles.backdrop}>
        <View style={syncStyles.box}>
          <ActivityIndicator size="large" color={color} />
          <Text style={syncStyles.title}>Connecting to {platformName}</Text>
          <Text style={syncStyles.sub}>Fetching your health metrics…</Text>
        </View>
      </View>
    </Modal>
  );
}

const syncStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, width: 260 },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HealthScreen() {
  const { profile } = useUserStore();
  const { todaySleep, sleepHistory, todayHealth, loadTodaySleep, loadSleepHistory, loadHealthMetrics } = useHealthStore();
  const { streak, logs } = useWorkoutStore();

  const [connectedPlatforms, setConnectedPlatforms] = useState<PlatformKey[]>([]);
  const [syncingPlatform, setSyncingPlatform] = useState<HealthPlatform | null>(null);
  const [syncedMetrics, setSyncedMetrics] = useState<typeof DEMO_SYNC_METRICS | null>(null);

  useEffect(() => {
    if (!profile) return;
    loadTodaySleep(profile.id);
    loadSleepHistory(profile.id, 14);
    loadHealthMetrics(profile.id);
  }, [profile]);

  const handleConnect = (platform: HealthPlatform) => {
    setSyncingPlatform(platform);
  };

  const handleSyncDone = () => {
    if (syncingPlatform) {
      setConnectedPlatforms((prev) => [...prev, syncingPlatform.key]);
      setSyncedMetrics(DEMO_SYNC_METRICS);
      setSyncingPlatform(null);
    }
  };

  const handleDisconnect = (key: PlatformKey) => {
    setConnectedPlatforms((prev) => prev.filter((k) => k !== key));
    if (connectedPlatforms.length <= 1) setSyncedMetrics(null);
  };

  // Merged vitals: prefer synced metrics if available, else stored health metrics
  const steps = syncedMetrics?.steps ?? todayHealth?.steps;
  const restingHr = syncedMetrics?.resting_hr ?? todayHealth?.resting_hr;
  const activeCal = syncedMetrics?.active_calories ?? todayHealth?.active_calories;
  const hrv = syncedMetrics?.hrv ?? todayHealth?.hrv;

  const lastNightSleepH = todaySleep ? (todaySleep.duration_min / 60).toFixed(1) : (syncedMetrics ? syncedMetrics.sleep_hours.toFixed(1) : '—');
  const lastNightScore = todaySleep?.sleep_score ?? syncedMetrics?.sleep_score ?? 0;
  const sleepScoreColor = lastNightScore >= 80 ? Colors.done : lastNightScore >= 60 ? Colors.partial : Colors.skipped;
  const sleepStatusText = lastNightScore >= 80 ? 'Excellent recovery' : lastNightScore >= 60 ? 'Decent sleep' : 'Poor recovery';

  const weeklyCompleted = logs.filter((l) => {
    const diff = Math.floor((Date.now() - new Date(l.date).getTime()) / 86400000);
    return diff <= 7 && ['done', 'partial', 'makeup'].includes(l.status);
  }).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Health Monitor</Text>
          <Text style={styles.subtitle}>Your body. Your data. Your edge.</Text>
        </View>

        {/* Synced banner */}
        {connectedPlatforms.length > 0 && (
          <View style={styles.syncBanner}>
            <Text style={styles.syncBannerText}>
              ✅ Syncing from {connectedPlatforms.map((k) => HEALTH_PLATFORMS.find((p) => p.key === k)?.name).join(' & ')}
            </Text>
            <Text style={styles.syncBannerSub}>Last updated just now</Text>
          </View>
        )}

        {/* Sleep card */}
        <Card elevated style={styles.card}>
          <View style={styles.sleepHeader}>
            <Text style={styles.sleepIcon}>🌙</Text>
            <View>
              <Text style={styles.metricLabel}>Last Night</Text>
              <Text style={styles.sleepHours}>{lastNightSleepH} hours</Text>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: `${sleepScoreColor}20` }]}>
              <Text style={[styles.scoreValue, { color: sleepScoreColor }]}>{lastNightScore || '—'}</Text>
              <Text style={[styles.scoreLabel, { color: sleepScoreColor }]}>Score</Text>
            </View>
          </View>
          <Text style={[styles.sleepStatus, { color: sleepScoreColor }]}>{lastNightScore ? sleepStatusText : 'No sleep data yet'}</Text>
          {lastNightScore > 0 && lastNightScore < 60 && (
            <View style={styles.sleepWarning}>
              <Text style={styles.sleepWarningText}>
                Poor sleep elevates cortisol, resisting fat loss. Today's workout has been scaled down 30%. Aim for bed by 10 PM.
              </Text>
            </View>
          )}
        </Card>

        {/* Sleep chart */}
        {sleepHistory.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Sleep — Last 14 Days</Text>
            <View style={styles.sleepBars}>
              {sleepHistory.slice(0, 14).reverse().map((log, i) => <SleepBar key={i} log={log} />)}
            </View>
            <View style={styles.legend}>
              {[{ color: Colors.done, label: 'Good (7+ hrs)' }, { color: Colors.partial, label: 'Fair (6–7 hrs)' }, { color: Colors.skipped, label: 'Poor (<6 hrs)' }].map((l) => (
                <View key={l.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                  <Text style={styles.legendLabel}>{l.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Today's vitals */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Today's Vitals</Text>
          <View style={styles.vitalsGrid}>
            {[
              { icon: '💓', value: restingHr ?? '—', label: 'Resting HR', warn: typeof restingHr === 'number' && restingHr > 75 },
              { icon: '👣', value: steps?.toLocaleString() ?? '—', label: 'Steps' },
              { icon: '🔥', value: activeCal ?? '—', label: 'Active Cal' },
              { icon: '🧠', value: hrv ?? '—', label: 'HRV' },
            ].map((v, i, arr) => (
              <React.Fragment key={v.label}>
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalIcon}>{v.icon}</Text>
                  <Text style={styles.vitalValue}>{v.value}</Text>
                  <Text style={styles.metricLabel}>{v.label}</Text>
                  {v.warn && <Text style={styles.vitalWarn}>Elevated</Text>}
                </View>
                {i < arr.length - 1 && <View style={styles.vitalDivider} />}
              </React.Fragment>
            ))}
          </View>

          {syncedMetrics && (
            <View style={styles.extraMetrics}>
              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>Stress Score</Text>
                <Text style={[styles.extraValue, { color: syncedMetrics.stress_score < 40 ? Colors.done : Colors.warning }]}>
                  {syncedMetrics.stress_score} / 100
                </Text>
              </View>
              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>Blood Oxygen (SpO₂)</Text>
                <Text style={[styles.extraValue, { color: Colors.done }]}>{syncedMetrics.blood_oxygen}%</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Weekly performance */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.weekRow}>
            <View style={styles.weekItem}>
              <Text style={styles.weekValue}>{weeklyCompleted}</Text>
              <Text style={styles.metricLabel}>Workouts</Text>
            </View>
            <View style={styles.weekItem}>
              <Text style={styles.weekValue}>{streak}</Text>
              <Text style={styles.metricLabel}>Day Streak</Text>
            </View>
            <View style={styles.weekItem}>
              <Text style={styles.weekValue}>
                {sleepHistory.length > 0
                  ? Math.round(sleepHistory.slice(0, 7).reduce((a, b) => a + b.sleep_score, 0) / Math.min(7, sleepHistory.length))
                  : '—'}
              </Text>
              <Text style={styles.metricLabel}>Avg Sleep</Text>
            </View>
          </View>
        </Card>

        {/* ── Health Platform Connector ─────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Connect Health Platform</Text>
          <Text style={styles.sectionHeaderSub}>
            Connect Apple Health, Google Health Connect, or Samsung Health to automatically sync all your health data.
          </Text>
        </View>

        <View style={styles.platformList}>
          {HEALTH_PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform.key}
              platform={platform}
              connected={connectedPlatforms.includes(platform.key)}
              onConnect={() => handleConnect(platform)}
              onDisconnect={() => handleDisconnect(platform.key)}
            />
          ))}
        </View>

        {connectedPlatforms.length === 0 && (
          <View style={styles.platformNote}>
            <Text style={styles.platformNoteText}>
              💡 Connecting a health platform pulls in steps, heart rate, HRV, sleep, active calories and more — automatically updating your dashboard every time you open the app.
            </Text>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Syncing modal */}
      {syncingPlatform && (
        <SyncingModal
          platformName={syncingPlatform.name}
          color={syncingPlatform.color}
          visible
          onDone={handleSyncDone}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  syncBanner: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: `${Colors.done}15`, borderRadius: BorderRadius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: `${Colors.done}30`,
  },
  syncBannerText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.done },
  syncBannerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  card: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },

  sleepHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  sleepIcon: { fontSize: 36 },
  sleepHours: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary },
  scoreBadge: { marginLeft: 'auto', alignItems: 'center', padding: Spacing.sm, borderRadius: BorderRadius.md, minWidth: 60 },
  scoreValue: { fontSize: FontSize.xxl, fontWeight: '900' },
  scoreLabel: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase' },
  sleepStatus: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
  sleepWarning: { backgroundColor: `${Colors.error}12`, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: Spacing.xs },
  sleepWarningText: { fontSize: FontSize.sm, color: Colors.error, lineHeight: 20 },

  sectionTitle: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', marginBottom: Spacing.md, letterSpacing: 0.5, textTransform: 'uppercase' },
  sleepBars: { flexDirection: 'row', height: 100, gap: 4, marginBottom: Spacing.sm, alignItems: 'flex-end' },
  legend: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },

  vitalsGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  vitalItem: { alignItems: 'center', flex: 1 },
  vitalIcon: { fontSize: 24, marginBottom: 4 },
  vitalValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  metricLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  vitalWarn: { fontSize: FontSize.xs, color: Colors.warning, marginTop: 2, fontWeight: '700' },
  vitalDivider: { width: 1, height: 60, backgroundColor: Colors.border },

  extraMetrics: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, gap: Spacing.xs },
  extraRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  extraLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  extraValue: { fontSize: FontSize.sm, fontWeight: '700' },

  weekRow: { flexDirection: 'row', justifyContent: 'space-around' },
  weekItem: { alignItems: 'center' },
  weekValue: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.primary },

  sectionHeader: { paddingHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.sm },
  sectionHeaderText: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  sectionHeaderSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },

  platformList: { paddingHorizontal: Spacing.lg },
  platformNote: {
    marginHorizontal: Spacing.lg, backgroundColor: `${Colors.primary}08`,
    borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.primary}20`,
  },
  platformNoteText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});
