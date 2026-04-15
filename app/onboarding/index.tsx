import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../stores/userStore';
import { requestNotificationPermission, scheduleDailyNotifications } from '../../engines/accountabilityEngine';
import { requestCalendarPermission } from '../../lib/calendar';
import { UserProfile } from '../../types';
import { DEFAULT_CALORIE_TARGET } from '../../constants/config';
import { IS_DEMO } from '../../constants/demo';
import {
  validateEmail, validatePassword, validateName,
  sanitizeText, checkAuthRateLimit, secureLog, maskEmail,
} from '../../lib/security';

const { width } = Dimensions.get('window');

const STEPS = [
  { id: 'welcome', title: 'Welcome to FitLife', subtitle: 'Your journey to a leaner, stronger you starts today.' },
  { id: 'account', title: 'Create your account', subtitle: 'Sign in fast or use your email.' },
  { id: 'profile', title: 'Tell me about you', subtitle: 'This helps me build your exact plan.' },
  { id: 'goals', title: 'Your goal weight', subtitle: 'Be specific. Specific goals create real change.' },
  { id: 'schedule', title: 'When do you train?', subtitle: 'I will work around your life.' },
  { id: 'permissions', title: 'Stay accountable', subtitle: 'Enable these for the full FitLife experience.' },
];

type AuthMethod = 'google' | 'facebook' | 'email' | null;

export default function OnboardingScreen() {
  const { setProfile } = useUserStore();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [goalWeightKg, setGoalWeightKg] = useState('');
  const [workoutTime, setWorkoutTime] = useState('07:00');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [calendarEnabled, setCalendarEnabled] = useState(true);
  const [error, setError] = useState('');
  const [isSignIn, setIsSignIn] = useState(false);

  const params = useLocalSearchParams<{ oauth?: string }>();

  // If redirected from OAuth callback with no profile, jump straight to profile step
  useEffect(() => {
    if (params.oauth) {
      const p = params.oauth as string;
      setAuthMethod(p === 'google' || p === 'facebook' ? (p as AuthMethod) : 'google');
      setStep(2);
    }
  }, []);

  const canAdvance = (): boolean => {
    if (step === 0) return true;
    if (step === 1) {
      if (authMethod === 'google' || authMethod === 'facebook') return true;
      if (isSignIn) return email.length > 3 && password.length >= 6;
      return name.length > 0 && email.length > 3 && password.length >= 8 && password === confirmPassword;
    }
    if (step === 2) return name.length > 0 && age.length > 0 && heightCm.length > 0 && weightKg.length > 0;
    if (step === 3) return goalWeightKg.length > 0;
    return true;
  };

  const handleSocialAuth = async (provider: 'google' | 'facebook') => {
    setAuthMethod(provider);
    setIsLoading(true);
    setError('');
    try {
      if (IS_DEMO) {
        await new Promise((r) => setTimeout(r, 800));
        setStep(2);
        setIsLoading(false);
        return;
      }
      // Rate limit social auth attempts
      if (!checkAuthRateLimit(`social-${provider}`)) {
        setError('Too many attempts. Please wait a minute and try again.');
        setIsLoading(false);
        return;
      }
      const redirectUrl = Platform.OS === 'web'
        ? `${window.location.origin}/auth/callback`
        : 'fitlife://auth/callback';

      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: redirectUrl, skipBrowserRedirect: false },
        });
        if (error) throw error;
      } else {
        // On native: get the auth URL and open it via the system browser.
        // skipBrowserRedirect:true prevents supabase from trying a DOM redirect.
        // After auth the deep link fitlife://auth/callback brings the user back.
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (data?.url) {
          setIsLoading(false);
          await Linking.openURL(data.url);
        }
      }
    } catch (e: any) {
      const raw: string = e.message ?? '';
      let friendly = 'Authentication failed. Please try again.';
      if (raw.includes('provider is not enabled') || raw.includes('Unsupported provider')) {
        friendly = `${provider === 'google' ? 'Google' : 'Facebook'} sign-in is not yet configured. Please use email sign-in or contact support.`;
      } else if (raw.includes('network') || raw.includes('fetch')) {
        friendly = 'Network error. Please check your connection and try again.';
      } else if (raw.length > 0 && raw.length < 120) {
        friendly = raw;
      }
      setError(friendly);
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    setError('');
    // Validate inputs before hitting the server
    const emailVal = validateEmail(email);
    if (!emailVal.ok) { setError(emailVal.error!); return; }
    const nameVal = validateName(name);
    if (!nameVal.ok) { setError(nameVal.error!); return; }
    const pwdVal = validatePassword(password);
    if (!pwdVal.ok) { setError(pwdVal.error!); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }

    if (!checkAuthRateLimit(email.toLowerCase())) {
      setError('Too many sign-in attempts. Please wait a minute.');
      return;
    }
    setAuthMethod('email');
    setStep(2);
  };

  // Sign-in handler for existing email/password users
  const handleEmailLoginExisting = async () => {
    setError('');
    const emailVal = validateEmail(email);
    if (!emailVal.ok) { setError(emailVal.error!); return; }
    if (!password) { setError('Password is required'); return; }
    if (!checkAuthRateLimit(email.toLowerCase())) {
      setError('Too many sign-in attempts. Please wait a minute.');
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      if (data.user) {
        await useUserStore.getState().loadProfile();
        if (useUserStore.getState().isOnboarded) {
          router.replace('/(tabs)');
        } else {
          // Authenticated but no profile record — continue to profile setup
          setAuthMethod('email');
          setStep(2);
        }
      }
    } catch (e: any) {
      const msg: string = e.message ?? '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    setError('');
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setIsLoading(true);
    try {
      let userId = 'demo-user-001';
      const safeName = sanitizeText(name, 100);
      const safeEmail = email.trim().toLowerCase();

      if (!IS_DEMO) {
        if (authMethod === 'email') {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: safeEmail,
            password,
            options: { data: { name: safeName } },
          });
          if (authError) throw authError;
          if (!authData.user) throw new Error('Account created — please check your email to confirm.');
          userId = authData.user.id;
        } else {
          // Social auth: user is already authenticated, get their ID
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Authentication session not found. Please sign in again.');
          userId = user.id;
        }
      }

      const profile: Omit<UserProfile, 'created_at'> = {
        id: userId,
        email: safeEmail || `${safeName.toLowerCase().replace(' ', '.')}@fitlife.app`,
        name: safeName,
        age: parseInt(age) || 30,
        height_cm: parseFloat(heightCm) || 170,
        weight_kg: parseFloat(weightKg) || 75,
        goal_weight_kg: parseFloat(goalWeightKg) || 70,
        target_calories: DEFAULT_CALORIE_TARGET,
        preferred_workout_time: workoutTime,
        calendar_sync_enabled: calendarEnabled,
        health_sync_enabled: false,
        phase: 1,
        week_number: 1,
      };

      if (!IS_DEMO) {
        await supabase.from('users').upsert({ ...profile, created_at: new Date().toISOString() });
      }

      if (notifEnabled) {
        await requestNotificationPermission();
        await scheduleDailyNotifications(workoutTime, safeName);
      }
      if (calendarEnabled) {
        await requestCalendarPermission();
      }

      secureLog.info('Profile created for', maskEmail(safeEmail || 'demo'));
      setProfile({ ...profile, created_at: new Date().toISOString() });
      router.replace('/(tabs)');
    } catch (e: any) {
      let msg: string = e.message ?? 'Sign up failed';
      if (msg.includes('Invalid API key') || msg.includes('invalid_api_key') || msg.includes('apikey')) {
        msg = 'App configuration error — please reinstall or contact support.';
      } else if (msg.includes('network') || msg.includes('fetch')) {
        msg = 'Network error. Please check your connection and try again.';
      } else if (msg.includes('User already registered')) {
        msg = 'An account with this email already exists. Use the "Sign in" option instead.';
      }
      setError(msg);
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
        <View style={[styles.progressFill, { width: `${((step) / (STEPS.length - 1)) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.stepTitle}>{step === 1 && isSignIn ? 'Welcome back' : STEPS[step].title}</Text>
          <Text style={styles.stepSubtitle}>{step === 1 && isSignIn ? 'Sign in to continue your journey.' : STEPS[step].subtitle}</Text>

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
                ].map(([icon, text]) => (
                  <View key={text} style={styles.featureRow}>
                    <Text style={styles.featureIcon}>{icon}</Text>
                    <Text style={styles.featureText}>{text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Step 1: Account — Social + Email */}
          {step === 1 && (
            <View style={styles.authSection}>
              {/* Social buttons — sign-up only */}
              {!isSignIn && (
                <>
                  <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={() => handleSocialAuth('google')}
                    disabled={isLoading}
                  >
                    {isLoading && authMethod === 'google' ? (
                      <ActivityIndicator size="small" color={Colors.textPrimary} />
                    ) : (
                      <Text style={styles.socialBtnIcon}>G</Text>
                    )}
                    <Text style={styles.socialBtnText}>Continue with Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.socialBtn, styles.facebookBtn]}
                    onPress={() => handleSocialAuth('facebook')}
                    disabled={isLoading}
                  >
                    {isLoading && authMethod === 'facebook' ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.socialBtnIcon, styles.facebookBtnIcon]}>f</Text>
                    )}
                    <Text style={[styles.socialBtnText, styles.facebookBtnText]}>Continue with Facebook</Text>
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or use email</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </>
              )}

              {/* Email form */}
              <View style={{ gap: Spacing.sm }}>
                {!isSignIn && (
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Full name"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="words"
                  />
                )}
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isSignIn ? 'Password' : 'Password (min 8 chars, 1 uppercase, 1 number)'}
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry
                />
                {!isSignIn && (
                  <>
                    <TextInput
                      style={[styles.input, confirmPassword && password !== confirmPassword && styles.inputError]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm password"
                      placeholderTextColor={Colors.textTertiary}
                      secureTextEntry
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <Text style={styles.errorText}>Passwords don't match</Text>
                    )}
                  </>
                )}
              </View>

              {/* Sign-in / Sign-up toggle */}
              <TouchableOpacity
                onPress={() => { setIsSignIn(!isSignIn); setError(''); setAuthMethod(null); }}
                style={{ marginTop: 4, alignItems: 'center' }}
              >
                <Text style={styles.toggleSignInText}>
                  {isSignIn ? 'New here? Create account →' : 'Already have an account? Sign In'}
                </Text>
              </TouchableOpacity>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {!isSignIn && (
                <Text style={styles.termsText}>
                  By continuing you agree to our Terms of Service and Privacy Policy.
                </Text>
              )}
            </View>
          )}

          {/* Step 2: Body stats */}
          {step === 2 && (
            <View style={styles.form}>
              {authMethod !== 'email' && (
                <>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="words"
                  />
                </>
              )}
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
                  <Text style={styles.bmiLabel}>Starting point — we're going to change this.</Text>
                </View>
              )}
            </View>
          )}

          {/* Step 3: Goal weight */}
          {step === 3 && (
            <View style={styles.form}>
              <Text style={styles.label}>Goal Weight (kg)</Text>
              <TextInput style={styles.input} value={goalWeightKg} onChangeText={setGoalWeightKg} keyboardType="decimal-pad" placeholder="e.g. 72" placeholderTextColor={Colors.textTertiary} />
              {goalWeightKg && weightKg && (
                <View style={styles.bmiPreview}>
                  <Text style={styles.bmiValue}>
                    Target: lose {Math.max(0, parseFloat(weightKg) - parseFloat(goalWeightKg)).toFixed(1)} kg
                  </Text>
                  <Text style={styles.bmiLabel}>A realistic, healthy timeline is 24–26 weeks.</Text>
                </View>
              )}
            </View>
          )}

          {/* Step 4: Schedule */}
          {step === 4 && (
            <View style={styles.form}>
              <Text style={styles.label}>Preferred Workout Time</Text>
              <Text style={styles.sublabel}>When do you plan to train most days?</Text>
              <View style={styles.timeGrid}>
                {['05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, workoutTime === t && styles.timeChipActive]}
                    onPress={() => setWorkoutTime(t)}
                  >
                    <Text style={[styles.timeChipLabel, workoutTime === t && styles.timeChipLabelActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.scheduleNote}>
                FitLife reads your calendar and adapts workouts around your meetings — automatically serving express or micro workouts when time is tight.
              </Text>
            </View>
          )}

          {/* Step 5: Permissions */}
          {step === 5 && (
            <View style={styles.form}>
              {[
                { key: 'notifications', icon: '🔔', title: 'Push Notifications', desc: 'Workout reminders, accountability nudges, streak alerts.', enabled: notifEnabled, toggle: setNotifEnabled },
                { key: 'calendar', icon: '📅', title: 'Calendar Access', desc: 'Reads your events to detect meeting conflicts and adjust workouts.', enabled: calendarEnabled, toggle: setCalendarEnabled },
              ].map((perm) => (
                <TouchableOpacity
                  key={perm.key}
                  style={[styles.permRow, perm.enabled && styles.permRowEnabled]}
                  onPress={() => perm.toggle(!perm.enabled)}
                >
                  <Text style={styles.permIcon}>{perm.icon}</Text>
                  <View style={styles.permInfo}>
                    <Text style={styles.permTitle}>{perm.title}</Text>
                    <Text style={styles.permDesc}>{perm.desc}</Text>
                  </View>
                  <View style={[styles.toggle, perm.enabled && styles.toggleOn]}>
                    <View style={[styles.toggleThumb, perm.enabled && styles.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>
              ))}
              <Text style={styles.permNote}>
                You can change these anytime in Settings.
              </Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          )}
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
            onPress={
              step === 1 && isSignIn
                ? handleEmailLoginExisting
                : step === 1 && authMethod !== 'google' && authMethod !== 'facebook'
                ? handleEmailSignIn
                : handleNext
            }
            disabled={!canAdvance() || isLoading}
          >
            {isLoading && (!authMethod || isSignIn) ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.nextBtnText}>
                {step === STEPS.length - 1 ? "Let's Go! 🚀" : step === 1 && isSignIn ? 'Sign In →' : 'Continue →'}
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

  progressBar: { height: 4, backgroundColor: Colors.border, marginHorizontal: 0 },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },

  content: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xl },

  stepTitle: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.xs },
  stepSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 24 },

  // Welcome
  welcomeContent: { alignItems: 'center' },
  welcomeEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  welcomeText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 26, marginBottom: Spacing.xl },
  featureList: { width: '100%', gap: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  featureIcon: { fontSize: 20, width: 30, textAlign: 'center' },
  featureText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600', flex: 1 },

  // Auth
  authSection: { gap: Spacing.sm },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.small,
  },
  socialBtnIcon: { fontSize: 18, fontWeight: '900', color: '#DB4437', width: 24, textAlign: 'center' },
  socialBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  facebookBtn: { backgroundColor: '#1877F2', borderColor: '#1877F2' },
  facebookBtnIcon: { color: '#fff' },
  facebookBtnText: { color: '#fff' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: '500' },

  termsText: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center', lineHeight: 18, marginTop: Spacing.xs },
  toggleSignInText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700', textDecorationLine: 'underline' },

  // Form
  form: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', marginBottom: 4, marginTop: Spacing.sm },
  sublabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: Spacing.sm, marginTop: -Spacing.xs },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    color: Colors.textPrimary, fontSize: FontSize.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputError: { borderColor: Colors.error },
  errorText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: '600' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  halfField: { flex: 1 },
  bmiPreview: {
    backgroundColor: `${Colors.primary}10`, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.sm,
    borderWidth: 1, borderColor: `${Colors.primary}30`,
  },
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

  // Nav
  navRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, paddingBottom: Spacing.lg },
  backBtn: { paddingHorizontal: Spacing.md, paddingVertical: 14, justifyContent: 'center' },
  backBtnText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  nextBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
});
