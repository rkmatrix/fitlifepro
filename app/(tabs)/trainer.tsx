import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/shared/Card';
import { useUserStore } from '../../stores/userStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useNutritionStore } from '../../stores/nutritionStore';
import { useHealthStore } from '../../stores/healthStore';
import { chatWithTrainer, getProactiveInsight } from '../../lib/openai';
import { AIMessage } from '../../types';
import { MEDITATION_PROGRAM, DISCIPLINE_CODE } from '../../constants/workoutPlan';

const QUICK_PROMPTS = [
  'What should I eat post-workout?',
  'Give me a 5-min emergency workout',
  'How do I fix my sleep?',
  'Explain visceral fat',
  'Motivate me today',
  'Guide my meditation',
];

export default function TrainerScreen() {
  const { profile } = useUserStore();
  const { todayLog, streak } = useWorkoutStore();
  const { today: nutrition } = useNutritionStore();
  const { todaySleep, todayHealth } = useHealthStore();

  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<'chat' | 'meditation' | 'habits'>('chat');
  const scrollRef = useRef<ScrollView>(null);

  const firstName = profile?.name.split(' ')[0] ?? 'Champion';

  // Welcome message on mount
  useEffect(() => {
    if (messages.length === 0 && profile) {
      const tip = getProactiveInsight({
        userProfile: {
          name: profile.name,
          age: profile.age,
          phase: profile.phase,
          weekNumber: profile.week_number,
          targetCalories: profile.target_calories,
        },
        workoutStatus: todayLog?.status,
        todayCalories: nutrition.calories,
        sleepHours: todaySleep ? todaySleep.duration_min / 60 : undefined,
        streak,
      });
      const welcome: AIMessage = {
        id: '0',
        role: 'assistant',
        content: `Good ${getTimeOfDay()}, ${firstName}. I'm your FitLife Coach — I know your plan, your progress, and what your body needs today.\n\n${tip}`,
        timestamp: new Date().toISOString(),
      };
      setMessages([welcome]);
    }
  }, [profile]);

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || !profile) return;
    setInput('');

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    const reply = await chatWithTrainer(updatedMessages, {
      userProfile: {
        name: profile.name,
        age: profile.age,
        phase: profile.phase,
        weekNumber: profile.week_number,
        targetCalories: profile.target_calories,
      },
      workoutStatus: todayLog?.status,
      todayCalories: nutrition.calories,
      todayProtein: nutrition.protein,
      sleepScore: todaySleep?.sleep_score,
      sleepHours: todaySleep ? todaySleep.duration_min / 60 : undefined,
      restingHR: todayHealth?.resting_hr,
      steps: todayHealth?.steps,
      streak,
    });

    const assistantMsg: AIMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const currentMeditationProgram = MEDITATION_PROGRAM.find(
    (p) => (profile?.week_number ?? 1) >= p.week_start && (profile?.week_number ?? 1) <= p.week_end
  ) ?? MEDITATION_PROGRAM[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarIcon}>🤖</Text>
        </View>
        <View>
          <Text style={styles.title}>FitLife Coach</Text>
          <Text style={styles.subtitle}>Always here. Always working for you.</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {(['chat', 'meditation', 'habits'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'chat' ? '💬 Chat' : t === 'meditation' ? '🧘 Meditate' : '📋 Habits'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'chat' && (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={100}
        >
          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                {msg.role === 'assistant' && (
                  <Text style={styles.assistantLabel}>Coach</Text>
                )}
                <Text style={[styles.messageText, msg.role === 'user' && styles.userMessageText]}>
                  {msg.content}
                </Text>
                <Text style={styles.messageTime}>
                  {format(new Date(msg.timestamp), 'h:mm a')}
                </Text>
              </View>
            ))}
            {isLoading && (
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <ActivityIndicator color={Colors.primary} size="small" />
              </View>
            )}
          </ScrollView>

          {/* Quick prompts */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPrompts} contentContainerStyle={styles.quickPromptsContent}>
            {QUICK_PROMPTS.map((p) => (
              <TouchableOpacity key={p} style={styles.quickPrompt} onPress={() => handleSend(p)}>
                <Text style={styles.quickPromptText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask your trainer anything..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={() => handleSend()} disabled={!input.trim()}>
              <Text style={styles.sendIcon}>▲</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {tab === 'meditation' && (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.meditationTab}>
          <Card style={styles.meditationCard} elevated>
            <Text style={styles.meditationWeek}>
              Week {currentMeditationProgram.week_start}–{currentMeditationProgram.week_end}
            </Text>
            <Text style={styles.meditationName}>{currentMeditationProgram.name}</Text>
            <Text style={styles.meditationTechnique}>{currentMeditationProgram.technique}</Text>
            <Text style={styles.meditationDuration}>⏱ {currentMeditationProgram.duration_min} minutes</Text>
            <Text style={styles.meditationQuote}>{currentMeditationProgram.description}</Text>

            <Text style={styles.instructionsTitle}>How to practice:</Text>
            {currentMeditationProgram.instructions.map((inst, i) => (
              <View key={i} style={styles.meditationStep}>
                <Text style={styles.meditationStepNum}>{i + 1}.</Text>
                <Text style={styles.meditationStepText}>{inst}</Text>
              </View>
            ))}
          </Card>

          {MEDITATION_PROGRAM.map((prog, i) => {
            const cardStyle = prog === currentMeditationProgram
              ? { ...styles.medProgCard, ...styles.medProgCardActive }
              : styles.medProgCard;
            return (
            <Card key={i} style={cardStyle}>
              <View style={styles.medProgRow}>
                <View>
                  <Text style={styles.medProgName}>{prog.name}</Text>
                  <Text style={styles.medProgWeek}>Weeks {prog.week_start}–{prog.week_end} · {prog.duration_min} min</Text>
                </View>
                {prog === currentMeditationProgram && (
                  <Text style={styles.currentBadge}>Current</Text>
                )}
              </View>
            </Card>
            );
          })}
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}

      {tab === 'habits' && (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.habitsTab}>
          <Text style={styles.habitsTitle}>Trainer's Discipline Code</Text>
          <Text style={styles.habitsSubtitle}>These are non-negotiable. Not rules — commitments to yourself.</Text>
          {DISCIPLINE_CODE.map((habit) => (
            <Card key={habit.id} style={styles.habitCard}>
              <View style={styles.habitRow}>
                <Text style={styles.habitIcon}>{habit.icon}</Text>
                <View style={styles.habitInfo}>
                  <Text style={styles.habitTitle}>{habit.title}</Text>
                  {habit.time && <Text style={styles.habitTime}>{habit.time}</Text>}
                  <Text style={styles.habitDesc}>{habit.description}</Text>
                </View>
              </View>
            </Card>
          ))}
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  aiAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,107,53,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
  aiAvatarIcon: { fontSize: 24 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: 'rgba(255,107,53,0.15)', borderColor: Colors.primary },
  tabLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  tabLabelActive: { color: Colors.primary },
  chatContainer: { flex: 1 },
  messages: { flex: 1, paddingHorizontal: Spacing.lg },
  messageBubble: { maxWidth: '85%', marginBottom: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  assistantLabel: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  messageText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },
  userMessageText: { color: '#fff' },
  messageTime: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4, alignSelf: 'flex-end' },
  quickPrompts: { flexGrow: 0, marginBottom: Spacing.sm },
  quickPromptsContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  quickPrompt: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  quickPromptText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { color: '#fff', fontSize: 16, fontWeight: '700' },
  meditationTab: { flex: 1, paddingHorizontal: Spacing.lg },
  meditationCard: { marginBottom: Spacing.md },
  meditationWeek: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  meditationName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  meditationTechnique: { fontSize: FontSize.md, color: Colors.secondary, fontWeight: '600', marginBottom: 4 },
  meditationDuration: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  meditationQuote: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 22, marginBottom: Spacing.md, paddingLeft: Spacing.sm, borderLeftWidth: 2, borderLeftColor: Colors.primary },
  instructionsTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  meditationStep: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  meditationStepNum: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700', width: 20 },
  meditationStepText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  medProgCard: { marginBottom: Spacing.sm },
  medProgCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,53,0.05)' },
  medProgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medProgName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  medProgWeek: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  currentBadge: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700', backgroundColor: 'rgba(255,107,53,0.1)', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  habitsTab: { flex: 1, paddingHorizontal: Spacing.lg },
  habitsTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  habitsSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 22 },
  habitCard: { marginBottom: Spacing.sm },
  habitRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  habitIcon: { fontSize: 28, width: 36 },
  habitInfo: { flex: 1 },
  habitTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  habitTime: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  habitDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },
});
