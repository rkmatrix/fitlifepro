import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated,
  Vibration, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../constants/theme';
import { Button } from '../../../components/shared/Button';
import { Card } from '../../../components/shared/Card';
import { useWorkoutStore } from '../../../stores/workoutStore';
import { WORKOUT_PLAN } from '../../../constants/workoutPlan';
import { WorkoutDay, WorkoutVariant } from '../../../types';

function findWorkout(id: string): WorkoutDay | null {
  for (const phase of WORKOUT_PLAN.phases) {
    const found = phase.days.find((d: WorkoutDay) => d.id === id);
    if (found) return found;
  }
  return null;
}

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
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={timerStyles.container}>
      <Text style={timerStyles.label}>Rest</Text>
      <Text style={timerStyles.time}>{remaining}s</Text>
      <View style={timerStyles.track}>
        <Animated.View style={[timerStyles.bar, { width }]} />
      </View>
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
  track: { width: '80%', height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.sm },
  bar: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 2 },
  skip: { fontSize: FontSize.sm, color: Colors.textSecondary },
});

export default function SessionScreen() {
  const { id, variant: variantParam } = useLocalSearchParams<{ id: string; variant: string }>();
  const { activeSession, startSession, logSet, advanceExercise, finishSession, cancelSession } = useWorkoutStore();

  const workout = id ? findWorkout(id) : null;
  const variant = (variantParam as WorkoutVariant) ?? 'full';

  const [isResting, setIsResting] = useState(false);
  const [currentReps, setCurrentReps] = useState(0);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (workout && !activeSession) {
      startSession(workout, variant);
    }
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const session = activeSession;
  if (!workout || !session) return null;

  const currentExercise = session.workoutDay.exercises[session.currentExerciseIndex];
  if (!currentExercise) return null;

  const totalExercises = session.workoutDay.exercises.length;
  const currentLog = session.exerciseLogs.find((l: { exercise_id: string }) => l.exercise_id === currentExercise.exercise.id);

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

  const handleFinish = async (status: 'done' | 'partial') => {
    await finishSession(status);
    router.replace('/(tabs)/workout');
  };

  const handleCancel = () => {
    Alert.alert('Cancel Workout?', 'Your progress will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Cancel Workout', style: 'destructive', onPress: () => { cancelSession(); router.back(); } },
    ]);
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
            <View>
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
              <Text style={styles.targetLabel}>{currentExercise.exercise.default_duration_sec ? 'Duration' : 'Reps'}</Text>
            </View>
            <View style={styles.targetDivider} />
            <View style={styles.targetItem}>
              <Text style={styles.targetValue}>{currentExercise.rest_sec}s</Text>
              <Text style={styles.targetLabel}>Rest</Text>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            {currentExercise.exercise.instructions.map((inst: string, i: number) => (
              <View key={i} style={styles.instructionRow}>
                <Text style={styles.instructionNum}>{i + 1}</Text>
                <Text style={styles.instructionText}>{inst}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Rest timer or Log button */}
        {isResting ? (
          <Card style={styles.restCard}>
            <RestTimer seconds={currentExercise.rest_sec} onComplete={handleRestComplete} />
          </Card>
        ) : (
          <Card style={styles.logCard}>
            <Text style={styles.logTitle}>Log This Set</Text>

            {/* Reps input */}
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

            {/* Weight input */}
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
          {session.workoutDay.exercises.slice(session.currentExerciseIndex + 1, session.currentExerciseIndex + 3).map((ex: { exercise: { name: string }; sets: number; reps: number }, i: number) => (
            <View key={i} style={styles.queueRow}>
              <Text style={styles.queueName}>{ex.exercise.name}</Text>
              <Text style={styles.queueSets}>{ex.sets}×{ex.reps}</Text>
            </View>
          ))}
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
  instructions: { gap: Spacing.xs },
  instructionRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  instructionNum: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, backgroundColor: 'rgba(255,107,53,0.1)', width: 20, height: 20, borderRadius: 10, textAlign: 'center', lineHeight: 20 },
  instructionText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
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
  finishRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  finishBtn: {},
  partialBtn: {},
});
