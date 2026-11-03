import { Repositories } from '../repositories/types';
import { Participant, Visit, ReminderJob, ReminderRule } from '../db/schema';
import { buildCalculatedEvents } from './calculatedEvents';
import { generateReminderJobs, calculateSendDatetime } from './reminderScheduler';
import { logAudit } from './auditLogger';

export type RescheduleType = 'new_visit' | 'rescheduled' | 'unchanged' | 'removed_or_canceled';

export interface RescheduleDetectionInput {
  previousVisit: Visit | null;
  newVisit: Visit | null;
}

export function detectReschedule({
  previousVisit,
  newVisit,
}: RescheduleDetectionInput): RescheduleType {
  if (!previousVisit?.scheduled_datetime && newVisit?.scheduled_datetime) {
    return 'new_visit';
  }

  if (previousVisit?.scheduled_datetime && !newVisit?.scheduled_datetime) {
    return 'removed_or_canceled';
  }

  if (
    previousVisit?.scheduled_datetime &&
    newVisit?.scheduled_datetime &&
    previousVisit.scheduled_datetime !== newVisit.scheduled_datetime
  ) {
    return 'rescheduled';
  }

  return 'unchanged';
}

export interface ApplyRescheduleResult {
  visit: Visit;
  canceledJobs: number;
  createdJobs: ReminderJob[];
  rescheduleEmailJob: ReminderJob | null;
}

export async function applyReschedule(
  repos: Repositories,
  participant: Participant,
  visit: Visit,
  oldDatetime: string | null,
  actor: string = 'system',
  previousVisit?: Visit
): Promise<ApplyRescheduleResult> {
  const visits = await repos.listVisitsByParticipantId(participant.id);
  const otherVisits = visits.filter((v) => v.id !== visit.id);

  // 1. Recalculate study events
  const day0Visit = [visit, ...otherVisits].find((v) => v.visit_day === 0);
  const day90Visit = [visit, ...otherVisits].find((v) => v.visit_day === 90);
  const day180Visit = [visit, ...otherVisits].find((v) => v.visit_day === 180);

  const { events, warnings } = buildCalculatedEvents(
    participant.study_id,
    day0Visit?.scheduled_date,
    day0Visit?.scheduled_time,
    day90Visit?.scheduled_date,
    day90Visit?.scheduled_time,
    day180Visit?.scheduled_date,
    day180Visit?.scheduled_time,
    participant.timezone
  );

  // Upsert all calculated events
  for (const event of events) {
    await repos.upsertCalculatedEvent({
      participant_id: participant.id,
      study_id: participant.study_id,
      source_visit_day: event.source_visit_day,
      event_key: event.event_key,
      event_name: event.event_name,
      event_date: event.event_date,
      event_time: event.event_time,
      event_datetime: event.event_datetime ? event.event_datetime.toISOString() : null,
      timezone: participant.timezone,
      calculation_rule: event.calculation_rule,
    });
  }

  // 2. Cancel future unsent reminder jobs based on old visit datetime
  let canceledJobs = 0;
  const dateChanged = oldDatetime !== null &&
    new Date(oldDatetime).getTime() !== new Date(visit.scheduled_datetime).getTime();
  if (dateChanged && oldDatetime) {
    canceledJobs = await repos.cancelReminderJobs(
      participant.id,
      visit.id,
      new Date(oldDatetime),
      'visit_rescheduled'
    );
  }

  // 3. Generate new reminder jobs for the changed visit
  const rules = await repos.listActiveReminderRules();
  const relevantRules = rules.filter((r) => getRulePhaseForVisitDay(visit.visit_day).includes(r.phase));

  const { created: createdJobs } = await generateReminderJobs(
    repos,
    participant,
    [visit, ...otherVisits],
    relevantRules
  );

  // Scheduling jobs above replace the old confirmation. Do not send a separate
  // reschedule email, even when the previous confirmation has already been sent.
  const rescheduleEmailJob = null;

  // 5. Audit log
  await logAudit(repos, {
    actor,
    action: oldDatetime ? 'visit_rescheduled' : 'visit_scheduled',
    entityType: 'visit',
    entityId: visit.id,
    participantId: participant.id,
    before: previousVisit
      ? (previousVisit as unknown as Record<string, unknown>)
      : null,
    after: visit as unknown as Record<string, unknown>,
  });

  return { visit, canceledJobs, createdJobs, rescheduleEmailJob };
}

function getRulePhaseForVisitDay(visitDay: number): string[] {
  switch (visitDay) {
    case 0:
      return ['day0', 'week6', 'week18'];
    case 90:
      return ['day90'];
    case 180:
      return ['day180'];
    default:
      return [];
  }
}

export { calculateSendDatetime };
