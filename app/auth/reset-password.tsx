import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { validatePassword } from '../../lib/security';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    const validation = validatePassword(password);
    if (!validation.ok) { setError(validation.error!); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }

    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => router.replace('/(tabs)'), 2000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.sub}>Choose a strong password (min 8 chars, 1 uppercase, 1 number).</Text>

        {done ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ Password updated! Redirecting…</Text>
          </View>
        ) : (
          <>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="New password" secureTextEntry placeholderTextColor={Colors.textTertiary} />
            <TextInput style={[styles.input, confirm && password !== confirm && styles.inputError]} value={confirm} onChangeText={setConfirm} placeholder="Confirm password" secureTextEntry placeholderTextColor={Colors.textTertiary} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Password</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.lg, justifyContent: 'center', gap: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: FontSize.md, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  inputError: { borderColor: Colors.error },
  errorText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: '600' },
  btn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm },
  btnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  successBox: { backgroundColor: `${Colors.done}15`, borderRadius: BorderRadius.md, padding: Spacing.md },
  successText: { fontSize: FontSize.md, color: Colors.done, fontWeight: '600' },
});
