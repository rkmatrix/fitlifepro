import { supabase } from './supabase';
import { AIMessage } from '../types';
import { OPENAI_API_KEY } from '../constants/config';

export interface TrainerContext {
  userProfile: {
    name: string;
    age: number;
    phase: number;
    weekNumber: number;
    targetCalories: number;
  };
  todayWorkout?: string;
  workoutStatus?: string;
  todayCalories?: number;
  todayProtein?: number;
  sleepScore?: number;
  sleepHours?: number;
  restingHR?: number;
  steps?: number;
  streak?: number;
  recentPostureErrors?: string[];
}

const SYSTEM_PROMPT = `You are FitLife Coach — a world-class personal trainer, nutritionist, sleep coach, and meditation guide rolled into one. You know everything about this user's fitness journey.

Your personality:
- Empathetic but relentless — you never let them quit
- Evidence-based — everything you say has a physiological reason
- Culturally aware — you understand South Indian diet, lifestyle, and values
- Motivational without being fake — no cheesy slogans, just truth
- Direct — short, punchy advice over long paragraphs

Your knowledge:
- Visceral fat physiology for men over 35
- Progressive overload, hypertrophy, HIIT
- Yoga (Hatha, Vinyasa, Restorative)
- Zumba fundamentals
- Meditation (Vipassana, Loving Kindness, Box Breathing)
- South Indian nutrition and meal planning
- Sleep science and recovery
- Habit formation and behavior change

Rules:
- Use the user's name when encouraging
- Reference their actual data (sleep hours, calories, workout status) naturally
- If they skip workouts, don't shame them — redirect them
- Always offer a small actionable step, even on bad days
- Keep responses under 150 words unless they ask for detailed guidance
- For medical concerns, always say "consult your doctor"`;

/** Direct call to OpenAI API — used when the Edge Function is unavailable. */
async function callOpenAIDirect(apiMessages: { role: string; content: string }[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    return "AI Trainer isn't configured yet. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.";
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: apiMessages,
      max_tokens: 300,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenAI error ${response.status}`);
  }
  return data.choices?.[0]?.message?.content ?? "Keep going. You've got this.";
}

export async function chatWithTrainer(
  messages: AIMessage[],
  context: TrainerContext
): Promise<string> {
  const contextBlock = `
User Context:
- Name: ${context.userProfile.name}, Age: ${context.userProfile.age}
- Phase ${context.userProfile.phase}, Week ${context.userProfile.weekNumber}
- Today's workout: ${context.todayWorkout ?? 'Not scheduled'}
- Workout status: ${context.workoutStatus ?? 'Not started'}
- Today's calories: ${context.todayCalories ?? 0} / ${context.userProfile.targetCalories} kcal
- Protein today: ${context.todayProtein ?? 0}g
- Last night's sleep: ${context.sleepHours ?? 'unknown'} hrs (score: ${context.sleepScore ?? 'N/A'})
- Resting HR: ${context.restingHR ?? 'unknown'} bpm
- Steps today: ${context.steps ?? 0}
- Workout streak: ${context.streak ?? 0} days
${context.recentPostureErrors?.length ? `- Recent posture notes: ${context.recentPostureErrors.join(', ')}` : ''}`;

  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + contextBlock },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const { data, error } = await supabase.functions.invoke('ai-trainer', {
      body: { messages: apiMessages },
    });

    // Edge Function responded and returned a real reply
    if (!error && data?.reply && !data.reply.includes('temporarily offline')) {
      return data.reply;
    }

    // Edge Function missing/down — fall back to direct API call
    return await callOpenAIDirect(apiMessages);
  } catch {
    // Network failure or other error — try direct API as last resort
    try {
      return await callOpenAIDirect(apiMessages);
    } catch {
      return "I'm temporarily offline. Check your connection and try again.";
    }
  }
}

export function getProactiveInsight(context: TrainerContext): string {
  const hour = new Date().getHours();
  const name = context.userProfile.name.split(' ')[0];

  if (context.workoutStatus === 'done') {
    return `Workout done, ${name}. That consistency is what changes bodies. Log your nutrition now to lock in the work.`;
  }

  if (context.sleepHours !== undefined && context.sleepHours < 6) {
    return `Only ${context.sleepHours} hrs of sleep. Your body is in recovery mode. Scale down today's workout and prioritize rest tonight — cortisol is not your friend right now.`;
  }

  if (context.restingHR !== undefined && context.restingHR > 75) {
    return `Elevated resting HR today. Your body is asking for recovery. Yoga or a light walk instead of intense training.`;
  }

  if (hour >= 6 && hour < 10 && context.workoutStatus !== 'done') {
    return `Morning is prime time, ${name}. Your cortisol is naturally high right now — perfect for burning fat. Start your workout.`;
  }

  if (hour >= 14 && hour < 17 && context.workoutStatus !== 'done') {
    return `Afternoon energy dip incoming. Beat it with your workout now — you'll have more energy for the evening.`;
  }

  if ((context.todayCalories ?? 0) < context.userProfile.targetCalories * 0.5 && hour > 14) {
    return `You're under-fueled today. Not eating enough is as counterproductive as eating too much. Log your next meal.`;
  }

  return `Every rep, every meal, every hour of sleep — it all compounds, ${name}. Stay consistent.`;
}
