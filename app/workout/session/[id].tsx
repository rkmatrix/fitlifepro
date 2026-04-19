import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated,
  Vibration, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../constants/theme';
import { Button } from '../../../components/shared/Button';
import { Card } from '../../../components/shared/Card';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { WORKOUT_PLAN, WARMUP_EXERCISES, COOLDOWN_EXERCISES } from '../../../constants/workoutPlan';
import { WorkoutDay, WorkoutDayExercise, WorkoutVariant } from '../../../types';
import { playBeep } from '../../../lib/beep';

type SessionPhase = 'warmup' | 'workout' | 'cooldown';

function findWorkout(id: string): WorkoutDay | null {
  for (const phase of WORKOUT_PLAN.phases) {
    const found = phase.days.find((d: WorkoutDay) => d.id === id);
    if (found) return found;
  }
  return null;
}

// ─── Rest Timer (beeps on last 5 seconds) ─────────────────────────────────────

function RestTimer({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setRemaining(seconds);
    Animated.timing(progress, {
      toValue: 0,
      duration: seconds * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          Vibration.vibrate(200);
          onComplete();
          return 0;
        }
        // Beep + short vibration for each of the last 5 countdown ticks
        if (r - 1 <= 5) {
          playBeep();
          Vibration.vibrate(80);
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const isLastFive = remaining <= 5 && remaining > 0;

  return (
    <View style={timerStyles.container}>
      <Text style={timerStyles.label}>Rest</Text>
      <Text style={[timerStyles.time, isLastFive && timerStyles.timeAlert]}>{remaining}s</Text>
      <View style={timerStyles.track}>
        <Animated.View style={[timerStyles.bar, { width }, isLastFive && timerStyles.barAlert]} />
      </View>
      {isLastFive && <Text style={timerStyles.beepHint}>♪ ♪ ♪</Text>}
      <TouchableOpacity onPress={onComplete}>
        <Text style={timerStyles.skip}>Skip Rest →</Text>
      </TouchableOpacity>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: Spacing.lg },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  time: { fontSize: 64, fontWeight: '900', color: Colors.secondary, marginVertical: Spacing.xs },
  timeAlert: { color: Colors.primary },
  track: { width: '80%', height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.sm },
  bar: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 2 },
  barAlert: { backgroundColor: Colors.primary },
  beepHint: { fontSize: FontSize.sm, color: Colors.primary, marginBottom: Spacing.xs, letterSpacing: 4 },
  skip: { fontSize: FontSize.sm, color: Colors.textSecondary },
});

// ─── Phase Exercise Timer (warmup & cooldown) ─────────────────────────────────

function PhaseExerciseTimer({
  durationSec,
  onComplete,
}: { durationSec: number; onComplete: () => void }) {
  const [remaining, setRemaining] = useState(durationSec);
  const progress = useRef(new Animated.Value(1)).current;
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: durationSec * 1000,
      useNativeDriver: false,
    }).start();
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          Vibration.vibrate(150);
          onComplete();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={ptStyles.container}>
      <Text style={ptStyles.remaining}>{remaining}s</Text>
      <View style={ptStyles.track}>
        <Animated.View style={[ptStyles.bar, { width }]} />
      </View>
    </View>
  );
}

const ptStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: Spacing.sm },
  remaining: { fontSize: 48, fontWeight: '900', color: Colors.secondary, marginBottom: Spacing.xs },
  track: { width: '100%', height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 3 },
});

// ─── Instruction List ─────────────────────────────────────────────────────────

function InstructionList({ instructions }: { instructions: string[] }) {
  return (
    <View style={instrStyles.list}>
      {instructions.map((inst, i) => (
        <View key={i} style={instrStyles.row}>
          <Text style={instrStyles.num}>{i + 1}</Text>
          <Text style={instrStyles.text}>{inst}</Text>
        </View>
      ))}
    </View>
  );
}

const instrStyles = StyleSheet.create({
  list: { gap: Spacing.xs, marginTop: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  num: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, backgroundColor: 'rgba(255,107,53,0.12)', width: 20, height: 20, borderRadius: 10, textAlign: 'center', lineHeight: 20 },
  text: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});

// ─── Video Tutorial Button ────────────────────────────────────────────────────

function VideoButton({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <TouchableOpacity
      style={vidBtnStyles.btn}
      onPress={() => Linking.openURL(url).catch(() => {})}
    >
      <Text style={vidBtnStyles.icon}>▶</Text>
      <Text style={vidBtnStyles.label}>Watch Tutorial</Text>
    </TouchableOpacity>
  );
}

const vidBtnStyles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: 'rgba(255,107,53,0.1)', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignSelf: 'flex-start', marginTop: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,107,53,0.25)' },
  icon: { fontSize: 13, color: Colors.primary },
  label: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
});

// ─── Phase Screen (Warmup / Cooldown) ────────────────────────────────────────

function PhaseScreen({
  phase, exercises, currentIndex, workoutName, elapsed, onNext, onSkip, onCancel,
}: {
  phase: 'warmup' | 'cooldown';
  exercises: WorkoutDayExercise[];
  currentIndex: number;
  workoutName: string;
  elapsed: number;
  onNext: () => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const item = exercises[currentIndex];
  const isLast = currentIndex === exercises.length - 1;
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const [timerKey, setTimerKey] = useState(0);
  const [timerDone, setTimerDone] = useState(false);
  const progressPct = ((currentIndex + 1) / exercises.length) * 100;

  const PHASE_LABEL = phase === 'warmup' ? '🔥 WARM UP' : '🧘 COOL DOWN';
  const PHASE_COLOR = phase === 'warmup' ? Colors.secondary : '#4ECDC4';

  const handleTimerDone = () => setTimerDone(true);

  const handleNextExercise = () => {
    setTimerDone(false);
    setTimerKey((k) => k + 1);
    onNext();
  };

  return (
    <SafeAreaView style={phStyles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={phStyles.header}>
        <TouchableOpacity onPress={onCancel} style={phStyles.cancelBtn}>
          <Text style={phStyles.cancelText}>✕</Text>
        </TouchableOpacity>
        <View style={phStyles.headerCenter}>
          <Text style={phStyles.workoutName}>{workoutName}</Text>
          <Text style={phStyles.headerTimer}>
            {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
          </Text>
        </View>
        <TouchableOpacity onPress={onSkip} style={phStyles.skipPhaseBtn}>
          <Text style={phStyles.skipPhaseTxt}>Skip →</Text>
        </TouchableOpacity>
      </View>

      {/* Phase label + progress */}
      <View style={phStyles.phaseBanner}>
        <Text style={[phStyles.phaseLabel, { color: PHASE_COLOR }]}>{PHASE_LABEL}</Text>
        <Text style={phStyles.phaseProgress}>{currentIndex + 1} / {exercises.length}</Text>
      </View>
      <View style={phStyles.progressTrack}>
        <View style={[phStyles.progressBar, { width: `${progressPct}%`, backgroundColor: PHASE_COLOR }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <Card elevated style={phStyles.card}>
          <Text style={[phStyles.exerciseName, { color: PHASE_COLOR }]}>{item.exercise.name}</Text>
          <Text style={phStyles.muscleGroup}>{item.exercise.muscle_group}</Text>
          <Text style={phStyles.description}>{item.exercise.description}</Text>

          <View style={phStyles.timerBox}>
            {!timerDone ? (
              <PhaseExerciseTimer
                key={timerKey}
                durationSec={item.duration_sec ?? item.exercise.default_duration_sec ?? 30}
                onComplete={handleTimerDone}
              />
            ) : (
              <View style={phStyles.doneBox}>
                <Text style={[phStyles.doneTick, { color: PHASE_COLOR }]}>✓</Text>
                <Text style={phStyles.doneLabel}>Done!</Text>
              </View>
            )}
          </View>

          {item.rest_sec > 0 && timerDone && (
            <Text style={phStyles.restHint}>Rest {item.rest_sec}s before next exercise</Text>
          )}

          <InstructionList instructions={item.exercise.instructions} />
          <VideoButton url={item.exercise.video_url} />
        </Card>

        {exercises.slice(currentIndex + 1, currentIndex + 3).length > 0 && (
          <Card style={phStyles.queueCard}>
            <Text style={phStyles.queueTitle}>Coming Up</Text>
            {exercises.slice(currentIndex + 1, currentIndex + 3).map((ex, i) => (
              <View key={i} style={phStyles.queueRow}>
                <Text style={phStyles.queueName}>{ex.exercise.name}</Text>
                <Text style={phStyles.queueDur}>
                  {ex.duration_sec ?? ex.exercise.default_duration_sec ?? 30}s
                </Text>
              </View>
            ))}
          </Card>
        )}

        <View style={phStyles.actionRow}>
          <Button
            title={isLast
              ? (phase === 'warmup' ? 'Start Workout 💪' : 'Finish Session ✅')
              : 'Next Exercise →'}
            onPress={handleNextExercise}
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const phStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  cancelBtn: { padding: Spacing.sm },
  cancelText: { fontSize: 18, color: Colors.textSecondary },
  headerCenter: { alignItems: 'center' },
  workoutName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  headerTimer: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.primary, marginTop: 2 },
  skipPhaseBtn: { padding: Spacing.sm },
  skipPhaseTxt: { fontSize: FontSize.sm, color: Colors.textSecondary },
  phaseBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: 4 },
  phaseLabel: { fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  phaseProgress: { fontSize: FontSize.sm, color: Colors.textSecondary },
  progressTrack: { height: 4, backgroundColor: Colors.border, marginHorizontal: Spacing.lg, borderRadius: 2, marginBottom: Spacing.md },
  progressBar: { height: '100%', borderRadius: 2 },
  card: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  exerciseName: { fontSize: FontSize.xxl, fontWeight: '900', marginBottom: 2 },
  muscleGroup: { fontSize: FontSize.sm, color: Colors.textSecondary, textTransform: 'capitalize', marginBottom: Spacing.sm },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  timerBox: { alignItems: 'center', paddingVertical: Spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border, marginVertical: Spacing.md },
  doneBox: { alignItems: 'center', paddingVertical: Spacing.sm },
  doneTick: { fontSize: 48, fontWeight: '900' },
  doneLabel: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  restHint: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center', marginBottom: Spacing.xs },
  queueCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  queueTitle: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  queueRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  queueName: { fontSize: FontSize.sm, color: Colors.textSecondary },
  queueDur: { fontSize: FontSize.sm, color: Colors.textTertiary },
  actionRow: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
});

// ─── Main Session Screen ──────────────────────────────────────────────────────

export default function SessionScreen() {
  const { id, variant: variantParam } = useLocalSearchParams<{ id: string; variant: string }>();
  const { activeSession, startSession, logSet, advanceExercise, finishSession, cancelSession } = useWorkoutStore();

  const workout = id ? findWorkout(id) : null;
  const variant = (variantParam as WorkoutVariant) ?? 'full';

  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('warmup');
  const [warmupIndex, setWarmupIndex] = useState(0);
  const [cooldownIndex, setCooldownIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [currentReps, setCurrentReps] = useState(0);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Elapsed timer runs across all three phases
  useEffect(() => {
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Start the session store only when entering the workout phase
  useEffect(() => {
    if (sessionPhase === 'workout' && workout && !activeSession) {
      startSession(workout, variant);
    }
  }, [sessionPhase]);

  const handleCancel = () => {
    Alert.alert('Cancel Workout?', 'Your progress will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Cancel Workout', style: 'destructive', onPress: () => { cancelSession(); router.back(); } },
    ]);
  };

  // ── Warmup navigation ────────────────────────────────────────────────────
  const handleWarmupNext = () => {
    if (warmupIndex >= WARMUP_EXERCISES.length - 1) setSessionPhase('workout');
    else setWarmupIndex((i) => i + 1);
  };

  // ── Cooldown navigation ──────────────────────────────────────────────────
  const handleCooldownNext = async () => {
    if (cooldownIndex >= COOLDOWN_EXERCISES.length - 1) {
      await finishSession('done');
      router.replace('/(tabs)/workout');
    } else {
      setCooldownIndex((i) => i + 1);
    }
  };

  // ── Finish main workout → go to cooldown (or bail for partial) ──────────
  const handleFinish = async (status: 'done' | 'partial') => {
    if (status === 'partial') {
      await finishSession('partial');
      router.replace('/(tabs)/workout');
      return;
    }
    setSessionPhase('cooldown');
  };

  // ─── WARMUP PHASE ──────────────────────────────────────────────────────────
  if (sessionPhase === 'warmup') {
    return (
      <PhaseScreen
        phase="warmup"
        exercises={WARMUP_EXERCISES}
        currentIndex={warmupIndex}
        workoutName={workout?.name ?? 'Workout'}
        elapsed={elapsed}
        onNext={handleWarmupNext}
        onSkip={() => setSessionPhase('workout')}
        onCancel={handleCancel}
      />
    );
  }

  // ─── COOLDOWN PHASE ────────────────────────────────────────────────────────
  if (sessionPhase === 'cooldown') {
    return (
      <PhaseScreen
        phase="cooldown"
        exercises={COOLDOWN_EXERCISES}
        currentIndex={cooldownIndex}
        workoutName={workout?.name ?? 'Workout'}
        elapsed={elapsed}
        onNext={handleCooldownNext}
        onSkip={async () => { await finishSession('done'); router.replace('/(tabs)/workout'); }}
        onCancel={handleCancel}
      />
    );
  }

  // ─── WORKOUT PHASE ─────────────────────────────────────────────────────────
  const session = activeSession;
  if (!workout || !session) return null;

  const currentExercise = session.workoutDay.exercises[session.currentExerciseIndex];
  if (!currentExercise) return null;

  const totalExercises = session.workoutDay.exercises.length;
  const currentLog = session.exerciseLogs.find(
    (l: { exercise_id: string }) => l.exercise_id === currentExercise.exercise.id,
  );

  const handleLogSet = () => {
    logSet(currentExercise.exercise.id, currentReps || currentExercise.reps, currentWeight);
    Vibration.vibrate(50);
    setIsResting(true);
  };

  const handleRestComplete = () => {
    setIsResting(false);
    if ((currentLog?.sets_completed ?? 0) + 1 >= currentExercise.sets) {
      if (session.currentExerciseIndex < totalExercises - 1) {
        advanceExercise();
        setCurrentReps(0);
        setCurrentWeight(0);
      }
    }
  };

  const progressPct = (session.currentExerciseIndex / totalExercises) * 100;
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <Text style={styles.timer}>
            {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/workout/session/${id}?posture=true`)}
          style={styles.cameraBtn}
        >
          <Text style={styles.cameraBtnText}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        {session.currentExerciseIndex + 1} / {totalExercises} exercises
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Current Exercise */}
        <Card elevated style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Text style={styles.exerciseLabel}>NOW</Text>
              <Text style={styles.exerciseName}>{currentExercise.exercise.name}</Text>
              <Text style={styles.exerciseMuscle}>{currentExercise.exercise.muscle_group}</Text>
            </View>
            <View style={styles.setsProgress}>
              <Text style={styles.setsText}>
                {currentLog?.sets_completed ?? 0} / {currentExercise.sets}
              </Text>
              <Text style={styles.setsLabel}>sets</Text>
            </View>
          </View>

          {/* Set targets */}
          <View style={styles.targetRow}>
            <View style={styles.targetItem}>
              <Text style={styles.targetValue}>
                {currentExercise.exercise.default_duration_sec
                  ? `${currentExercise.exercise.default_duration_sec}s`
                  : currentExercise.reps}
              </Text>
              <Text style={styles.targetLabel}>
                {currentExercise.exercise.default_duration_sec ? 'Duration' : 'Reps'}
              </Text>
            </View>
            <View style={styles.targetDivider} />
            <View style={styles.targetItem}>
              <Text style={styles.targetValue}>{currentExercise.rest_sec}s</Text>
              <Text style={styles.targetLabel}>Rest</Text>
            </View>
          </View>

          <InstructionList instructions={currentExercise.exercise.instructions} />
          <VideoButton url={currentExercise.exercise.video_url} />
        </Card>

        {/* Rest timer or Log button */}
        {isResting ? (
          <Card style={styles.restCard}>
            <RestTimer seconds={currentExercise.rest_sec} onComplete={handleRestComplete} />
          </Card>
        ) : (
          <Card style={styles.logCard}>
            <Text style={styles.logTitle}>Log This Set</Text>

            {!currentExercise.exercise.default_duration_sec && (
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Reps</Text>
                <View style={styles.numericInput}>
                  <TouchableOpacity onPress={() => setCurrentReps(Math.max(0, currentReps - 1))}>
                    <Text style={styles.numericBtn}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.numericValue}>{currentReps || currentExercise.reps}</Text>
                  <TouchableOpacity onPress={() => setCurrentReps(currentReps + 1)}>
                    <Text style={styles.numericBtn}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <View style={styles.numericInput}>
                <TouchableOpacity onPress={() => setCurrentWeight(Math.max(0, currentWeight - 2.5))}>
                  <Text style={styles.numericBtn}>−</Text>
                </TouchableOpacity>
                <Text style={styles.numericValue}>{currentWeight}</Text>
                <TouchableOpacity onPress={() => setCurrentWeight(currentWeight + 2.5)}>
                  <Text style={styles.numericBtn}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button
              title={`Log Set ${(currentLog?.sets_completed ?? 0) + 1}`}
              onPress={handleLogSet}
              size="lg"
              style={styles.logBtn}
            />
          </Card>
        )}

        {/* Exercise queue */}
        <Card style={styles.queueCard}>
          <Text style={styles.queueTitle}>Up Next</Text>
          {session.workoutDay.exercises
            .slice(session.currentExerciseIndex + 1, session.currentExerciseIndex + 3)
            .map((ex: { exercise: { name: string }; sets: number; reps: number }, i: number) => (
              <View key={i} style={styles.queueRow}>
                <Text style={styles.queueName}>{ex.exercise.name}</Text>
                <Text style={styles.queueSets}>{ex.sets}×{ex.reps}</Text>
              </View>
            ))}
          {session.currentExerciseIndex >= totalExercises - 2 && (
            <Text style={styles.cooldownHint}>🧘 Cool-down stretches are next</Text>
          )}
        </Card>

        {/* Finish buttons */}
        <View style={styles.finishRow}>
          <Button title="Complete Workout" onPress={() => handleFinish('done')} size="lg" style={styles.finishBtn} />
          <Button title="Mark Partial" onPress={() => handleFinish('partial')} variant="secondary" size="md" style={styles.partialBtn} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  cancelBtn: { padding: Spacing.sm },
  cancelText: { fontSize: 18, color: Colors.textSecondary },
  headerCenter: { alignItems: 'center' },
  workoutName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  timer: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.primary, marginTop: 2 },
  cameraBtn: { backgroundColor: Colors.surface, borderRadius: BorderRadius.full, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  cameraBtnText: { fontSize: 18 },
  progressTrack: { height: 3, backgroundColor: Colors.border, marginHorizontal: Spacing.lg, borderRadius: 2 },
  progressBar: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  progressLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: Spacing.md },
  exerciseCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  exerciseLabel: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  exerciseName: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary, marginTop: 2 },
  exerciseMuscle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  setsProgress: { alignItems: 'center', backgroundColor: 'rgba(255,107,53,0.1)', padding: Spacing.md, borderRadius: BorderRadius.md },
  setsText: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.primary },
  setsLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  targetRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, justifyContent: 'space-around' },
  targetItem: { alignItems: 'center' },
  targetValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  targetLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  targetDivider: { width: 1, backgroundColor: Colors.border },
  restCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  logCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  logTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  inputLabel: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '600' },
  numericInput: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  numericBtn: { fontSize: FontSize.xl, color: Colors.primary, fontWeight: '700', paddingHorizontal: Spacing.sm },
  numericValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, minWidth: 48, textAlign: 'center' },
  logBtn: {},
  queueCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  queueTitle: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  queueRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  queueName: { fontSize: FontSize.sm, color: Colors.textSecondary },
  queueSets: { fontSize: FontSize.sm, color: Colors.textTertiary },
  cooldownHint: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: Spacing.xs, fontStyle: 'italic' },
  finishRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  finishBtn: {},
  partialBtn: {},
});
