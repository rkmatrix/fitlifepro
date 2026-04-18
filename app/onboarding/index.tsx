import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { useUserStore } from '../../stores/userStore';
import { UserProfile } from '../../types';
import { DEFAULT_CALORIE_TARGET } from '../../constants/config';
import { sanitizeText } from '../../lib/security';

const { width } = Dimensions.get('window');

const STEPS = [
  { id: 'welcome', title: 'Welcome to FitLife',  subtitle: 'Your journey to a leaner, stronger you starts today.' },
  { id: 'profile', title: 'Tell me about you',   subtitle: 'This helps me build your exact plan.' },
];

export default function OnboardingScreen() {
  const { setProfile } = useUserStore();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const canAdvance = (): boolean => {
    if (step === 0) return true;
    if (step === 1) return name.trim().length > 0 && age.length > 0 && heightCm.length > 0 && weightKg.length > 0;
    if (step === 2) return goalWeightKg.length > 0;
    return true;
  };

  const handleNext = async () => {
    setError('');
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }

    // Last step — save profile and enter the app
    setIsLoading(true);
    try {
      const safeName = sanitizeText(name.trim(), 100);
      const w = parseFloat(weightKg) || 75;
      const profile: UserProfile = {
        id: `local_${Date.now()}`,
        email: '',
        name: safeName,
        age: parseInt(age) || 30,
        height_cm: parseFloat(heightCm) || 170,
        weight_kg: w,
        goal_weight_kg: Math.max(w - 5, 50),
        target_calories: DEFAULT_CALORIE_TARGET,
        preferred_workout_time: '07:00',
        calendar_sync_enabled: false,
        health_sync_enabled: false,
        phase: 1,
        week_number: 1,
        created_at: new Date().toISOString(),
      };
      await setProfile(profile);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const bmi = heightCm && weightKg
    ? (parseFloat(weightKg) / Math.pow(parseFloat(heightCm) / 100, 2)).toFixed(1)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / (STEPS.length - 1)) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.stepTitle}>{STEPS[step].title}</Text>
          <Text style={styles.stepSubtitle}>{STEPS[step].subtitle}</Text>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeEmoji}>💪</Text>
              <Text style={styles.welcomeText}>
                FitLife is your personal trainer, nutritionist, sleep coach, and accountability partner — all in one.
              </Text>
              <View style={styles.featureList}>
                {[
                  ['⚡', 'Personalized 6-month workout plan'],
                  ['🤖', 'AI trainer powered by GPT-4o'],
                  ['📷', 'Real-time posture correction'],
                  ['📅', 'Smart calendar-aware scheduling'],
                  ['🥗', 'Nutrition tracking & South Indian meals'],
                  ['🌙', 'Sleep & health monitoring'],
                  ['🔥', 'Zero-escape accountability engine'],
                  ['📱', 'Everything stored privately on your phone'],
                ].map(([icon, text]) => (
                  <View key={text} style={styles.featureRow}>
                    <Text style={styles.featureIcon}>{icon}</Text>
                    <Text style={styles.featureText}>{text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Step 1: Profile */}
          {step === 1 && (
            <View style={styles.form}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Rajesh Kumar"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="words"
              />
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Age</Text>
                  <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="e.g. 35" placeholderTextColor={Colors.textTertiary} />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <TextInput style={styles.input} value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" placeholder="e.g. 175" placeholderTextColor={Colors.textTertiary} />
                </View>
              </View>
              <Text style={styles.label}>Current Weight (kg)</Text>
              <TextInput style={styles.input} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholder="e.g. 82" placeholderTextColor={Colors.textTertiary} />
              {bmi && (
                <View style={styles.bmiPreview}>
                  <Text style={styles.bmiValue}>BMI: {bmi}</Text>
                  <Text style={styles.bmiLabel}>Starting point — we are going to change this.</Text>
                </View>
              )}
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canAdvance() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.nextBtnText}>
                {step === STEPS.length - 1 ? "Let's Go! 🚀" : 'Continue →'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  progressBar: { height: 4, backgroundColor: Colors.border },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  content: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  stepTitle: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.xs },
  stepSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 24 },

  welcomeContent: { alignItems: 'center' },
  welcomeEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  welcomeText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 26, marginBottom: Spacing.xl },
  featureList: { width: '100%', gap: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  featureIcon: { fontSize: 20, width: 30, textAlign: 'center' },
  featureText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600', flex: 1 },

  form: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', marginBottom: 4, marginTop: Spacing.sm },
  sublabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: Spacing.sm, marginTop: -Spacing.xs },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 14, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border },
  errorText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: '600' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  halfField: { flex: 1 },
  bmiPreview: { backgroundColor: `${Colors.primary}10`, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: `${Colors.primary}30` },
  bmiValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  bmiLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  timeChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  timeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeChipLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  timeChipLabelActive: { color: '#fff' },
  scheduleNote: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, fontStyle: 'italic', marginTop: Spacing.sm },

  permRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  permRowEnabled: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}06` },
  permIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  permInfo: { flex: 1 },
  permTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  permDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: Colors.border, padding: 2 },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  permNote: { fontSize: FontSize.xs, color: Colors.textTertiary, lineHeight: 20, marginTop: Spacing.sm, fontStyle: 'italic' },

  navRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, paddingBottom: Spacing.lg },
  backBtn: { paddingHorizontal: Spacing.md, paddingVertical: 14, justifyContent: 'center' },
  backBtnText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  nextBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
});