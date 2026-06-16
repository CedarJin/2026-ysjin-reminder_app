import { addWeeks, addDays, startOfDay } from 'date-fns';
import { DEFAULT_TIMEZONE } from './timezone';
import { getMondayOfWeek } from './timezone';

export type CurrentPhase =
  | 'Needs Day 0 schedule'
  | 'Pre-Day 0'
  | 'Post-Day 0'
  | 'Week 6'
  | 'Needs Day 90 schedule'
  | 'Pre-Day 90'
  | 'Post-Day 90'
  | 'Week 18'
  | 'Needs Day 180 schedule'
  | 'Pre-Day 180'
  | 'Post-Day 180 / Completed pending review';

export interface VisitDates {
  day0Date: string | null;
  day90Date: string | null;
  day180Date: string | null;
}

export function getCurrentPhase(
  { day0Date, day90Date, day180Date }: VisitDates,
  today: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): CurrentPhase {
  const now = startOfDay(today);

  if (!day0Date) {
    return 'Needs Day 0 schedule';
  }

  const day0 = startOfDay(new Date(day0Date + 'T00:00:00Z'));

  if (now < day0) {
    return 'Pre-Day 0';
  }

  const week6Monday = startOfDay(getMondayOfWeek(addWeeks(day0, 6), timezone));
  const week6End = addDays(week6Monday, 7);

  if (now >= week6Monday && now < week6End) {
    return 'Week 6';
  }

  if (now >= week6End && !day90Date) {
    return 'Needs Day 90 schedule';
  }

  if (day90Date) {
    const day90 = startOfDay(new Date(day90Date + 'T00:00:00Z'));

    if (now < day90) {
      return 'Pre-Day 90';
    }

    const week18Monday = startOfDay(getMondayOfWeek(addWeeks(day0, 18), timezone));
    const week18End = addDays(week18Monday, 7);

    if (day180Date) {
      const day180 = startOfDay(new Date(day180Date + 'T00:00:00Z'));

      if (now < day180) {
        return 'Pre-Day 180';
      }

      return 'Post-Day 180 / Completed pending review';
    }

    if (now >= week18Monday && now < week18End) {
      return 'Week 18';
    }

    if (now >= week18End) {
      return 'Needs Day 180 schedule';
    }

    return 'Post-Day 90';
  }

  return 'Post-Day 0';
}
