import { Repositories } from '../repositories/types';
import { ReminderRule, ReminderJob, Participant, Visit } from '../db/schema';
import { combineDateAndTime, addDays, addWeeks, getMondayOfWeek, splitDateTime } from '../timezone';
import { findEquivalentJob } from './duplicatePrevention';

export interface GenerateReminderJobsResult {
  created: ReminderJob[];
  skipped: Array<{ rule: ReminderRule; reason: string }>;
}

function findVisit(visits: Visit[], visitDay: number): Visit | undefined {
  return visits.find((v) => v.visit_day === visitDay);
}

function getVisitForRule(rule: ReminderRule, visits: Visit[]): Visit | undefined {
  switch (rule.phase) {
    case 'day0':
    case 'week6':
    case 'week18':
      return findVisit(visits, 0);
    case 'day90':
      return findVisit(visits, 90);
    case 'day180':
      return findVisit(visits, 180);
    default:
      return undefined;
  }
}

function generateReminderId(): string {
  return `rem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function calculateSendDatetime(
  rule: ReminderRule,
  visit: Visit,
  timezone: string
): Date | null {
  const visitDateTime = new Date(visit.scheduled_datetime);

  switch (rule.trigger_type) {
    case 'send_when_new_visit_scheduled': {
      if (rule.phase === 'day180') {
        // Day 180 scheduling is sent 14 days before visit at 09:00
        const sendDate = addDays(new Date(visit.scheduled_date + 'T00:00:00Z'), -14);
        return combineDateAndTime(splitDateTime(sendDate, timezone).date, '09:00', timezone);
      }
      // Day 0 and Day 90 scheduling emails are sent 10 minutes after scheduling
      return new Date(Date.now() + 10 * 60 * 1000);
    }

    case 'relative_to_visit_date': {
      if (rule.offset_amount == null || !rule.offset_unit) return null;

      const baseDateTime = new Date(visit.scheduled_datetime);
      let sendDate: Date;

      if (rule.offset_unit === 'days') {
        sendDate = addDays(baseDateTime, rule.offset_amount);
      } else if (rule.offset_unit === 'hours') {
        const result = new Date(baseDateTime);
        result.setUTCHours(result.getUTCHours() + rule.offset_amount);
        sendDate = result;
      } else {
        return null;
      }

      if (rule.fixed_send_time) {
        const { date } = splitDateTime(sendDate, timezone);
        return combineDateAndTime(date, rule.fixed_send_time, timezone);
      }

      return sendDate;
    }

    case 'monday_of_week_after_day0': {
      if (rule.week_number == null) return null;
      const day0Date = new Date(visit.scheduled_date + 'T00:00:00Z');
      const targetDate = addWeeks(day0Date, rule.week_number);
      const sendDate = getMondayOfWeek(targetDate, timezone);
      const { date } = splitDateTime(sendDate, timezone);
      return combineDateAndTime(date, rule.fixed_send_time || '09:00', timezone);
    }

    default:
      return null;
  }
}

export async function generateReminderJobs(
  repos: Repositories,
  participant: Participant,
  visits: Visit[],
  rules: ReminderRule[],
  now: Date = new Date()
): Promise<GenerateReminderJobsResult> {
  const created: ReminderJob[] = [];
  const skipped: Array<{ rule: ReminderRule; reason: string }> = [];

  for (const rule of rules) {
    if (!rule.active) continue;

    const visit = getVisitForRule(rule, visits);
    if (!visit) {
      skipped.push({ rule, reason: `Required visit not found for phase ${rule.phase}` });
      continue;
    }

    const sendDatetime = calculateSendDatetime(rule, visit, participant.timezone);
    if (!sendDatetime) {
      skipped.push({ rule, reason: 'Could not calculate send datetime' });
      continue;
    }

    const { date: sendDate, time: sendTime } = splitDateTime(sendDatetime, participant.timezone);

    const visitDatetimeSnapshot = new Date(visit.scheduled_datetime);

    const existing = await findEquivalentJob(repos, {
      participantId: participant.id,
      ruleId: rule.rule_id,
      scheduledSendDatetime: sendDatetime,
      visitDatetimeSnapshot,
    });

    if (existing) {
      skipped.push({ rule, reason: 'Equivalent reminder job already exists' });
      continue;
    }

    const job = await repos.createReminderJob({
      reminder_id: generateReminderId(),
      participant_id: participant.id,
      study_id: participant.study_id,
      visit_id: visit.id,
      phase: rule.phase,
      rule_id: rule.rule_id,
      email_name: rule.email_name,
      template_id: rule.template_id,
      scheduled_send_date: sendDate,
      scheduled_send_time: sendTime,
      scheduled_send_datetime: sendDatetime.toISOString(),
      visit_date_snapshot: visit.scheduled_date,
      visit_time_snapshot: visit.scheduled_time,
      visit_datetime_snapshot: visitDatetimeSnapshot.toISOString(),
      status: 'scheduled' as const,
      sent_at: null,
      canceled_at: null,
      canceled_reason: null,
      provider_message_id: null,
      last_error: null,
    });

    created.push(job);
  }

  return { created, skipped };
}

export function getActiveRulesForStudy(rules: ReminderRule[], studyId?: string): ReminderRule[] {
  return rules.filter(
    (r) => r.active && (!r.study_id || r.study_id === studyId || studyId === undefined)
  );
}
