import { ParsedRow } from './parseSpreadsheet';
import { validateDateFormat, validateTimeFormat } from '../timezone';

export interface ValidatedRow {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: NormalizedImportRow;
}

export interface NormalizedImportRow {
  studyId: string;
  participantId?: string;
  firstName: string;
  lastName: string;
  email: string;
  timezone: string;
  scheduledDay0Date: string;
  scheduledDay0Time: string;
  scheduledDay90Date?: string;
  scheduledDay90Time?: string;
  scheduledDay180Date?: string;
  scheduledDay180Time?: string;
  status?: string;
  emailOptOut?: boolean;
  notes?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateParticipantRow(row: ParsedRow, defaultTimezone: string = 'America/Los_Angeles'): ValidatedRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredColumns = [
    'study_id',
    'first_name',
    'last_name',
    'email',
    'scheduled_day_0_date',
    'scheduled_day_0_time',
  ];

  for (const col of requiredColumns) {
    if (!row[col] || row[col]?.trim() === '') {
      errors.push(`Missing required column: ${col}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const studyId = row.study_id!;
  const firstName = row.first_name!;
  const lastName = row.last_name!;
  const email = row.email!;
  const scheduledDay0Date = row.scheduled_day_0_date!;
  const scheduledDay0Time = row.scheduled_day_0_time!;

  if (!EMAIL_REGEX.test(email)) {
    errors.push(`Invalid email: ${email}`);
  }

  if (!validateDateFormat(scheduledDay0Date)) {
    errors.push(`Invalid Day 0 date format: ${scheduledDay0Date}. Expected YYYY-MM-DD.`);
  }

  if (!validateTimeFormat(scheduledDay0Time)) {
    errors.push(`Invalid Day 0 time format: ${scheduledDay0Time}. Expected HH:MM.`);
  }

  const day90Date = row.scheduled_day_90_date;
  const day90Time = row.scheduled_day_90_time;
  if (day90Date || day90Time) {
    if (!day90Date || !day90Time) {
      errors.push('Day 90 date and time must both be provided if either is present.');
    }
    if (day90Date && !validateDateFormat(day90Date)) {
      errors.push(`Invalid Day 90 date format: ${day90Date}`);
    }
    if (day90Time && !validateTimeFormat(day90Time)) {
      errors.push(`Invalid Day 90 time format: ${day90Time}`);
    }
  }

  const day180Date = row.scheduled_day_180_date;
  const day180Time = row.scheduled_day_180_time;
  if (day180Date || day180Time) {
    if (!day180Date || !day180Time) {
      errors.push('Day 180 date and time must both be provided if either is present.');
    }
    if (day180Date && !validateDateFormat(day180Date)) {
      errors.push(`Invalid Day 180 date format: ${day180Date}`);
    }
    if (day180Time && !validateTimeFormat(day180Time)) {
      errors.push(`Invalid Day 180 time format: ${day180Time}`);
    }
  }

  const status = row.status || 'active';
  if (!['active', 'paused', 'withdrawn', 'completed'].includes(status)) {
    errors.push(`Invalid status: ${status}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  return {
    valid: true,
    errors,
    warnings,
    data: {
      studyId,
      participantId: row.participant_id,
      firstName,
      lastName,
      email,
      timezone: row.timezone || defaultTimezone,
      scheduledDay0Date,
      scheduledDay0Time,
      scheduledDay90Date: day90Date,
      scheduledDay90Time: day90Time,
      scheduledDay180Date: day180Date,
      scheduledDay180Time: day180Time,
      status,
      emailOptOut: row.email_opt_out === 'true',
      notes: row.notes,
    },
  };
}
