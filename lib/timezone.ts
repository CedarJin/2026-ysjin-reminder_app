import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { startOfWeek, parseISO, isValid } from 'date-fns';

export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

export function validateDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function validateTimeFormat(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}

export function combineDateAndTime(date: string, time: string, timezone: string): Date {
  if (!validateDateFormat(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
  }
  if (!validateTimeFormat(time)) {
    throw new Error(`Invalid time format: ${time}. Expected HH:MM.`);
  }

  const localIso = `${date}T${time}:00`;
  const result = fromZonedTime(localIso, timezone);

  if (!isValid(result)) {
    throw new Error(`Could not combine date ${date} and time ${time} in timezone ${timezone}`);
  }

  return result;
}

export function splitDateTime(datetime: Date, timezone: string): { date: string; time: string } {
  return {
    date: formatInTimeZone(datetime, timezone, 'yyyy-MM-dd'),
    time: formatInTimeZone(datetime, timezone, 'HH:mm'),
  };
}

export function getMondayOfWeek(date: Date, timezone: string): Date {
  const zoned = toZonedTime(date, timezone);
  const mondayLocal = startOfWeek(zoned, { weekStartsOn: 1 });
  return fromZonedTime(mondayLocal, timezone);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function subtractHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setUTCHours(result.getUTCHours() - hours);
  return result;
}

export function formatDate(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'MMMM d, yyyy');
}

export function formatTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'h:mm a');
}

export function formatDateTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "MMMM d, yyyy 'at' h:mm a");
}

export function parseDate(date: string): Date {
  const parsed = parseISO(date);
  if (!isValid(parsed)) {
    throw new Error(`Invalid date: ${date}`);
  }
  return parsed;
}
