import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { EXERCISES } from '../../constants/workoutPlan';
import { Exercise } from '../../types';
import { VideoPlayer } from '../../components/shared/VideoPlayer';

function findExercise(id: string): Exercise | null {
  return EXERCISES[id] ?? null;
}

/** Fetch a YouTube video ID for an exercise using the YouTube Data API v3 */
async function fetchVideoId(exerciseName: string): Promise<string | null> {
  const q = encodeURIComponent(`${exerciseName} exercise how to form tutorial`);

  // ── 1. YouTube Data API v3 search (most reliable) ──────────────────────────
  const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search` +
        `?q=${q}&part=id&type=video&maxResults=1&key=${apiKey}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (res.ok) {
        const data = await res.json();
        const videoId = data?.items?.[0]?.id?.videoId as string | undefined;
        if (videoId) return videoId;
      }
    } catch { /* fall through */ }
  }

  // ── 2. YouTube oEmbed trick — works without API key and without CORS ────────
  // We use the YouTube search URL and read the canonical URL from oEmbed
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${q}`;
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(searchUrl)}&format=json`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (oembed.ok) {
      const data = await oembed.json();
      // oembed for search pages often returns the top result thumbnail url containing the video id
      const thumbUrl: string = data?.thumbnail_url ?? '';
      const m = thumbUrl.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
      if (m?.[1]) return m[1];
    }
  } catch { /* fall through */ }

  // ── 3. allorigins.win proxy fallback ────────────────────────────────────────
  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${q}`;
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(ytUrl)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (res.ok) {
      const data = await res.json();
      const html: string = data?.contents ?? '';
      const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (match?.[1]) return match[1];
    }
  } catch { /* fall through */ }

  return null;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const exercise = id ? findExercise(id) : null;

  // Video state
  const [showVideo, setShowVideo] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Rest timer state
  const [timerSec, setTimerSec] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startTimer = () => {
    if (timerActive) return;
    setTimerActive(true);
    timerRef.current = setInterval(() => setTimerSec((s) => s + 1), 1000);
  };

  const pauseTimer = () => {
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resetTimer = () => {
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerSec(0);
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace('/(tabs)/workout');
    }
  };

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Exercise not found</Text>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backLinkText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleWatch = async () => {
    setShowVideo(true);
    if (!videoId) {
      setVideoLoading(true);
      setVideoError(false);
      try {
        const vid = await fetchVideoId(exercise.name);
        if (vid) {
          setVideoId(vid);
        } else {
          setVideoError(true);
        }
      } catch {
        setVideoError(true);
      } finally {
        setVideoLoading(false);
      }
    }
  };

  const videoEmbedUri = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`
    : null;

  const difficultyColor = {
    beginner: Colors.done,
    intermediate: Colors.partial,
    advanced: Colors.error,
  }[exercise.difficulty] ?? Colors.textSecondary;

  const muscleColor = (Colors as any)[exercise.muscle_group] ?? Colors.primary;

  // Timer color based on elapsed time relative to rest_sec
  const timerOver = timerSec > exercise.rest_sec;
  const timerColor = timerOver ? Colors.error : timerActive ? Colors.done : Colors.primary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{exercise.name}</Text>
        <TouchableOpacity style={styles.videoBtn} onPress={handleWatch}>
          <Text style={styles.videoBtnIcon}>▶</Text>
          <Text style={styles.videoBtnText}>Watch</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: `${muscleColor}12` }]}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.muscleTag, { color: muscleColor }]}>
                {exercise.muscle_group.toUpperCase()}
              </Text>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
            </View>
            <View style={[styles.diffBadge, { backgroundColor: `${difficultyColor}15`, borderColor: difficultyColor }]}>
              <Text style={[styles.diffText, { color: difficultyColor }]}>{exercise.difficulty}</Text>
            </View>
          </View>
          <Text style={styles.description}>{exercise.description}</Text>

          {/* Watch banner */}
          <TouchableOpacity style={styles.watchBanner} onPress={handleWatch}>
            <View style={styles.watchPlay}>
              <Text style={styles.watchPlayText}>▶</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.watchTitle}>Watch How To Do It</Text>
              <Text style={styles.watchSubtitle}>YouTube tutorial — plays in-app</Text>
            </View>
            <Text style={styles.watchArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Sets', value: String(exercise.default_sets) },
            {
              label: exercise.default_duration_sec ? 'Duration' : 'Reps',
              value: exercise.default_duration_sec
                ? `${exercise.default_duration_sec}s`
                : String(exercise.default_reps),
            },
            { label: 'Rest', value: `${exercise.rest_sec}s` },
            { label: 'Posture AI', value: exercise.posture_support ? '✓' : '—' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Rest Timer ─────────────────────────────────────────────────── */}
        <View style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <Text style={styles.timerTitle}>Rest Timer</Text>
            <Text style={styles.timerHint}>
              Recommended: {exercise.rest_sec}s rest between sets
            </Text>
          </View>
          <View style={styles.timerDisplay}>
            <Text style={[styles.timerTime, { color: timerColor }]}>
              {formatTime(timerSec)}
            </Text>
            {timerSec > 0 && (
              <Text style={[styles.timerStatus, { color: timerOver ? Colors.error : Colors.textTertiary }]}>
                {timerOver
                  ? `${timerSec - exercise.rest_sec}s over rest`
                  : `${exercise.rest_sec - timerSec}s remaining`}
              </Text>
            )}
          </View>
          <View style={styles.timerBtns}>
            {!timerActive ? (
              <TouchableOpacity
                style={[styles.timerBtn, styles.timerBtnStart]}
                onPress={startTimer}
              >
                <Text style={styles.timerBtnStartText}>▶ Start</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.timerBtn, styles.timerBtnPause]}
                onPress={pauseTimer}
              >
                <Text style={styles.timerBtnPauseText}>⏸ Pause</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.timerBtn, styles.timerBtnReset]}
              onPress={resetTimer}
            >
              <Text style={styles.timerBtnResetText}>↺ Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Equipment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment</Text>
          {exercise.equipment.length === 0 ? (
            <View style={styles.noEquipRow}>
              <Text style={styles.noEquipIcon}>🏠</Text>
              <Text style={styles.noEquipText}>Bodyweight only — no equipment needed</Text>
            </View>
          ) : (
            <View style={styles.equipChips}>
              {exercise.equipment.map((eq, i) => (
                <View key={i} style={styles.equipChip}>
                  <Text style={styles.equipChipText}>{eq}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How To Do It</Text>
          {exercise.instructions.map((inst, i) => (
            <View key={i} style={styles.instructionRow}>
              <View style={[styles.instructionNum, { backgroundColor: `${Colors.primary}15` }]}>
                <Text style={[styles.instructionNumText, { color: Colors.primary }]}>{i + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{inst}</Text>
            </View>
          ))}
        </View>

        {/* Posture AI */}
        {exercise.posture_support && (
          <View style={styles.postureCard}>
            <Text style={styles.postureIcon}>📷</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.postureTitle}>Live Posture Correction</Text>
              <Text style={styles.postureText}>
                During workout session, tap the camera button for AI posture analysis.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* In-app video bottom sheet */}
      <Modal
        visible={showVideo}
        animationType="slide"
        transparent
        onRequestClose={() => setShowVideo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalDragHandle} />
              <View style={styles.modalTitleRow}>
                <View style={styles.modalYTBadge}>
                  <Text style={styles.modalYTText}>▶</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>{exercise.name}</Text>
                  <Text style={styles.modalSubtitle}>YouTube tutorial</Text>
                </View>
                <TouchableOpacity onPress={() => setShowVideo(false)} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.videoFrame}>
              {videoLoading ? (
                <View style={styles.videoPlaceholder}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.videoPlaceholderText}>Finding the best tutorial…</Text>
                </View>
              ) : videoError ? (
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoErrorIcon}>😔</Text>
                  <Text style={styles.videoErrorText}>Couldn't load video</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => {
                    setVideoId(null);
                    setVideoError(false);
                    handleWatch();
                  }}>
                    <Text style={styles.retryBtnText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : videoEmbedUri ? (
                <VideoPlayer uri={videoEmbedUri} />
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterText}>
                Auto-selected tutorial for "{exercise.name}" via YouTube
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  notFoundText: { fontSize: FontSize.lg, color: Colors.textSecondary },
  backLinkText: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginLeft: -6 },
  backBtnText: { fontSize: 32, color: Colors.primary, lineHeight: 36, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  videoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  videoBtnIcon: { fontSize: 11, color: '#fff' },
  videoBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: '#fff' },

  scroll: { flex: 1 },

  heroCard: { margin: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  muscleTag: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.2 },
  exerciseName: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary, marginTop: 2 },
  diffBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, marginTop: 4 },
  diffText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },

  watchBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  watchPlay: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FF0000', justifyContent: 'center', alignItems: 'center' },
  watchPlayText: { fontSize: 14, color: '#fff', marginLeft: 2 },
  watchTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  watchSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 1 },
  watchArrow: { fontSize: 20, color: Colors.textTertiary },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 2, fontWeight: '600' },

  // Rest Timer
  timerCard: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.small,
  },
  timerHeader: { marginBottom: Spacing.sm },
  timerTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  timerHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  timerDisplay: { alignItems: 'center', paddingVertical: Spacing.sm },
  timerTime: { fontSize: 52, fontWeight: '900', letterSpacing: 2, lineHeight: 60 },
  timerStatus: { fontSize: FontSize.sm, marginTop: 4, fontWeight: '600' },
  timerBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  timerBtn: { flex: 1, borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center' },
  timerBtnStart: { backgroundColor: Colors.done },
  timerBtnStartText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  timerBtnPause: { backgroundColor: Colors.warning },
  timerBtnPauseText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  timerBtnReset: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  timerBtnResetText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSize.md },

  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm,
  },
  noEquipRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: `${Colors.done}10`, borderRadius: BorderRadius.md, padding: Spacing.sm,
  },
  noEquipIcon: { fontSize: 22 },
  noEquipText: { fontSize: FontSize.sm, color: Colors.done, fontWeight: '600' },
  equipChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  equipChip: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border,
  },
  equipChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, textTransform: 'capitalize' },

  instructionRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', marginBottom: Spacing.sm },
  instructionNum: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  instructionNumText: { fontSize: FontSize.xs, fontWeight: '800' },
  instructionText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },

  postureCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: `${Colors.secondary}10`, marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  postureIcon: { fontSize: 24 },
  postureTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.secondary, marginBottom: 4 },
  postureText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  modalHeader: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalDragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.sm },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  modalYTBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FF0000', justifyContent: 'center', alignItems: 'center' },
  modalYTText: { fontSize: 14, color: '#fff', marginLeft: 2 },
  modalTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  modalSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 1 },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '700' },

  videoFrame: { height: 400, backgroundColor: '#000' },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#111' },
  videoPlaceholderText: { color: '#aaa', fontSize: FontSize.sm, marginTop: Spacing.xs },
  videoErrorIcon: { fontSize: 36 },
  videoErrorText: { color: '#aaa', fontSize: FontSize.sm },
  retryBtn: { marginTop: Spacing.xs, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 20, paddingVertical: 8 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },

  modalFooter: { padding: Spacing.sm, backgroundColor: Colors.background },
  modalFooterText: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center', lineHeight: 18 },
});
