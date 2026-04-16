import * as Notifications from 'expo-notifications';
import { WorkoutStatus, WorkoutVariant, WorkoutDay } from '../types';
import { format, parseISO } from 'date-fns';
import { localDB } from '../lib/local-db';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── State-Driven Accountability Logic ───────────────────────────────────────

interface AccountabilityState {
  userId: string;
  workoutStatus: WorkoutStatus | null;
  workoutDay: WorkoutDay | null;
  workoutVariant: WorkoutVariant;
  preferredWorkoutTime: string; // "07:00"
  streak: number;
  userName: string;
}

/**
 * Called when the app comes to foreground or at key time checkpoints.
 * Evaluates the current state and fires the appropriate accountability action.
 */
export async function evaluateAccountability(state: AccountabilityState): Promise<void> {
  const now = new Date();
  const hour = now.getHours();
  const min = now.getMinutes();
  const currentMinutes = hour * 60 + min;

  const [prefHour, prefMin] = state.preferredWorkoutTime.split(':').map(Number);
  const prefMinutes = prefHour * 60 + prefMin;
  const minutesSincePref = currentMinutes - prefMinutes;

  // Already done — no accountability needed
  if (state.workoutStatus === 'done' || state.workoutStatus === 'makeup') return;

  if (minutesSincePref >= 15 && minutesSincePref < 30) {
    await sendNudge(
      'Your workout window just started.',
      `Ready, ${state.userName}? Even 15 minutes of movement counts today.`,
      state.userId,
      'nudge'
    );
  } else if (minutesSincePref >= 30 && minutesSincePref < 90) {
    await sendNudge(
      'Still here with you.',
      `Morning slipped? I've found an evening slot. Shall I set a reminder?`,
      state.userId,
      'redirect'
    );
  } else if (minutesSincePref >= 90 && minutesSincePref < 180) {
    await sendNudge(
      'Evening workout time.',
      `Your best window is between 5–7 PM. You still have time today.`,
      state.userId,
      'redirect'
    );
  } else if (hour >= 20 && hour < 21) {
    const message = state.streak >= 5
      ? `Your ${state.streak}-day streak is at risk. A 10-min routine right now saves it.`
      : `One 10-minute night routine. No equipment. Keeps the momentum alive.`;
    await sendNudge('Last call for today.', message, state.userId, 'streak_save');
  } else if (hour >= 21 && state.workoutStatus === null) {
    await sendNudge(
      'Rest day logged.',
      `Tomorrow is a fresh start. Your body recovers tonight — use it well. Sleep by 10:30 PM.`,
      state.userId,
      'nudge'
    );
  }
}

async function sendNudge(
  title: string,
  body: string,
  userId: string,
  eventType: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, data: { type: eventType } },
    trigger: null, // immediate
  });

  // Log locally
  const events = await localDB.get<object[]>('accountability_events') ?? [];
  await localDB.set('accountability_events', [
    ...events,
    {
      id: `ae_${Date.now()}`,
      user_id: userId,
      date: format(new Date(), 'yyyy-MM-dd'),
      event_type: eventType,
      message_sent: `${title}: ${body}`,
      acted_on: false,
      created_at: new Date().toISOString(),
    },
  ]);
}

// ─── Scheduled Daily Notifications ───────────────────────────────────────────

export async function scheduleDailyNotifications(
  preferredWorkoutTime: string,
  userName: string
): Promise<void> {
  // Cancel all existing scheduled notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  const [workoutHour, workoutMin] = preferredWorkoutTime.split(':').map(Number);

  // 6:00 AM Morning ritual
  await scheduleDaily(6, 0, 'Good morning, rise and shine!',
    `Start with 500ml water and 5 deep breaths. Today\'s workout is ready for you.`);

  // 30 min before preferred workout
  const remindHour = workoutMin >= 30 ? workoutHour : workoutHour - 1;
  const remindMin = workoutMin >= 30 ? workoutMin - 30 : workoutMin + 30;
  await scheduleDaily(remindHour, remindMin, `${userName}, workout in 30 minutes.`,
    `Get your gear ready. Your body transformation continues today.`);

  // 12:00 PM lunch reminder
  await scheduleDaily(12, 0, 'Fuel time.', 'Have you logged your lunch? Protein with every meal.');

  // 9:00 PM sleep prep
  await scheduleDaily(21, 0, 'Wind down time.',
    `Great work today. Screens off in 30 minutes. Sleep is where you actually build muscle.`);

  // Sunday 3 PM meal prep
  await scheduleWeekly(0, 15, 0, 'Meal prep Sunday.',
    `It\'s prep day. 2 hours now = 5 days of controlled nutrition. Start your prep.`);
}

async function scheduleDaily(
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    } as Notifications.CalendarTriggerInput,
  });
}

async function scheduleWeekly(
  weekday: number,
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      weekday: weekday + 1, // Expo uses 1-based
      hour,
      minute,
      repeats: true,
    } as Notifications.CalendarTriggerInput,
  });
}

// ─── Streak Milestone Notifications ──────────────────────────────────────────

export async function sendStreakMilestone(streak: number, userName: string): Promise<void> {
  const milestones: Record<number, string> = {
    3: `3 days strong, ${userName}. The habit is forming.`,
    7: `7-day streak! One week of unbroken commitment. This is how bodies change.`,
    14: `Two weeks straight. You're not just working out — you're becoming someone who works out.`,
    21: `21 days. Science says it takes 21 days to form a habit. You just proved it.`,
    30: `30 days. One month of showing up. Fitness is becoming your identity.`,
    60: `60 days, ${userName}. Most people quit in week 2. You're still here.`,
    90: `90 days. Your body has changed. Your brain has changed. This IS your lifestyle now.`,
  };

  const message = milestones[streak];
  if (!message) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${streak}-Day Streak!`,
      body: message,
      sound: true,
      data: { type: 'milestone' },
    },
    trigger: null,
  });
}

// ─── Recovery Week Detector ───────────────────────────────────────────────────

export async function checkWeeklyCompletionRate(
  userId: string,
  userName: string
): Promise<void> {
  const sevenDaysAgo = format(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    'yyyy-MM-dd'
  );
  const allLogs = await localDB.get<Array<{ user_id: string; date: string; status: string }>>('workout_logs') ?? [];
  const data = allLogs.filter((l) => l.user_id === userId && l.date >= sevenDaysAgo);

  if (!data.length) return;

  const completed = data.filter((l) =>
    ['done', 'partial', 'makeup'].includes(l.status)
  ).length;
  const completionRate = completed / 5; // 5 training days per week

  if (completionRate < 0.6 && data.length >= 3) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recovery Week Activated',
        body: `This week was tough, ${userName} — I noticed. Here's a lighter plan to restore momentum without burning out. Open FitLife for your recovery plan.`,
        sound: true,
        data: { type: 'recovery_week' },
      },
      trigger: null,
    });
  }
}
