import * as Calendar from 'expo-calendar';
import { CalendarConflict, WorkoutVariant } from '../types';

export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function getCalendars(): Promise<Calendar.Calendar[]> {
  try {
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return cals;
  } catch {
    return [];
  }
}

export async function getEventsInWindow(
  startDate: Date,
  endDate: Date
): Promise<Calendar.Event[]> {
  try {
    const hasPermission = await requestCalendarPermission();
    if (!hasPermission) return [];

    const cals = await getCalendars();
    if (cals.length === 0) return [];

    const calIds = cals.map((c) => c.id);
    const events = await Calendar.getEventsAsync(calIds, startDate, endDate);
    return events;
  } catch {
    return [];
  }
}

/**
 * Given a desired workout start time, find how many minutes are free
 * before the next calendar event. Returns conflict info and appropriate variant.
 */
export async function analyzeWorkoutWindow(
  workoutStartTime: Date,
  fullDurationMin: number
): Promise<{
  availableWindowMin: number;
  variant: WorkoutVariant;
  conflict: CalendarConflict | null;
}> {
  const windowEnd = new Date(workoutStartTime.getTime() + (fullDurationMin + 30) * 60 * 1000);
  const events = await getEventsInWindow(workoutStartTime, windowEnd);

  // Filter events that start during the desired workout window
  const blockingEvents = events.filter((e) => {
    const eventStart = new Date(e.startDate);
    return eventStart > workoutStartTime && eventStart < windowEnd;
  });

  if (blockingEvents.length === 0) {
    return { availableWindowMin: fullDurationMin, variant: 'full', conflict: null };
  }

  // Use the earliest blocking event
  const earliest = blockingEvents.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )[0];
  const eventStart = new Date(earliest.startDate);
  const availableMin = Math.floor(
    (eventStart.getTime() - workoutStartTime.getTime()) / (60 * 1000)
  );

  let variant: WorkoutVariant = 'full';
  if (availableMin >= fullDurationMin) {
    variant = 'full';
  } else if (availableMin >= 20) {
    variant = 'express';
  } else if (availableMin >= 8) {
    variant = 'micro';
  } else {
    variant = 'desk';
  }

  const conflict: CalendarConflict = {
    date: workoutStartTime.toISOString().split('T')[0],
    event_title: earliest.title,
    event_start: earliest.startDate as string,
    event_end: earliest.endDate as string,
    available_window_min: availableMin,
    variant_used: variant,
  };

  return { availableWindowMin: availableMin, variant, conflict };
}

/**
 * Create a "makeup workout" event in the user's default calendar.
 */
export async function scheduleMakeupWorkout(
  title: string,
  startDate: Date,
  durationMin: number
): Promise<string | null> {
  try {
    const hasPermission = await requestCalendarPermission();
    if (!hasPermission) return null;

    const cals = await getCalendars();
    const writableCal = cals.find(
      (c) => c.allowsModifications
    );
    if (!writableCal) return null;

    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
    const eventId = await Calendar.createEventAsync(writableCal.id, {
      title: `FitLife: ${title}`,
      startDate,
      endDate,
      notes: 'Scheduled by FitLife — your makeup workout. Show up.',
      alarms: [{ relativeOffset: -15 }],
    });

    return eventId;
  } catch {
    return null;
  }
}
