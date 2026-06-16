import { Repositories } from '../repositories/types';
import { Visit, Participant } from '../db/schema';
import { combineDateAndTime } from '../timezone';
import { applyReschedule } from './rescheduleDetector';

export interface CreateVisitInput {
  participantId: string;
  studyId: string;
  visitDay: 0 | 90 | 180;
  visitName: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone?: string;
}

export interface UpdateVisitInput {
  scheduledDate?: string;
  scheduledTime?: string;
  timezone?: string;
  status?: Visit['status'];
}

function visitDayToName(visitDay: number): string {
  switch (visitDay) {
    case 0:
      return 'Day 0';
    case 90:
      return 'Day 90';
    case 180:
      return 'Day 180';
    default:
      return `Day ${visitDay}`;
  }
}

export async function createVisit(
  repos: Repositories,
  input: CreateVisitInput,
  actor: string = 'system'
): Promise<{ visit: Visit; createdJobs: Awaited<ReturnType<typeof applyReschedule>>['createdJobs'] }> {
  const participant = await repos.getParticipantById(input.participantId);
  if (!participant) {
    throw new Error(`Participant not found: ${input.participantId}`);
  }

  const timezone = input.timezone || participant.timezone;
  const scheduledDatetime = combineDateAndTime(
    input.scheduledDate,
    input.scheduledTime,
    timezone
  );

  const existingVisit = await repos.getVisitByParticipantAndDay(input.participantId, input.visitDay);
  if (existingVisit) {
    throw new Error(
      `Visit already exists for participant ${input.participantId} and day ${input.visitDay}`
    );
  }

  const visit = await repos.createVisit({
    participant_id: input.participantId,
    study_id: input.studyId,
    visit_day: input.visitDay,
    visit_name: input.visitName || visitDayToName(input.visitDay),
    scheduled_date: input.scheduledDate,
    scheduled_time: input.scheduledTime,
    scheduled_datetime: scheduledDatetime.toISOString(),
    timezone,
    status: 'scheduled',
  });

  const { createdJobs } = await applyReschedule(repos, participant, visit, null, actor);

  return { visit, createdJobs };
}

export async function updateVisit(
  repos: Repositories,
  visitId: string,
  input: UpdateVisitInput,
  actor: string = 'system'
): Promise<{
  visit: Visit;
  canceledJobs: number;
  createdJobs: Awaited<ReturnType<typeof applyReschedule>>['createdJobs'];
  rescheduleEmailJob: Awaited<ReturnType<typeof applyReschedule>>['rescheduleEmailJob'];
}> {
  const beforeVisit = await repos.getVisitById(visitId);
  if (!beforeVisit) {
    throw new Error(`Visit not found: ${visitId}`);
  }

  const participant = await repos.getParticipantById(beforeVisit.participant_id);
  if (!participant) {
    throw new Error(`Participant not found: ${beforeVisit.participant_id}`);
  }

  const timezone = input.timezone || beforeVisit.timezone;
  const scheduledDate = input.scheduledDate || beforeVisit.scheduled_date;
  const scheduledTime = input.scheduledTime || beforeVisit.scheduled_time;
  const scheduledDatetime = combineDateAndTime(scheduledDate, scheduledTime, timezone);

  const updateData: Partial<Visit> = {};
  const dateChanged =
    (input.scheduledDate !== undefined && input.scheduledDate !== beforeVisit.scheduled_date) ||
    (input.scheduledTime !== undefined && input.scheduledTime !== beforeVisit.scheduled_time);

  if (input.scheduledDate !== undefined) updateData.scheduled_date = input.scheduledDate;
  if (input.scheduledTime !== undefined) updateData.scheduled_time = input.scheduledTime;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.status !== undefined) {
    updateData.status = input.status;
  } else if (dateChanged && beforeVisit.status === 'scheduled') {
    // Auto-set to rescheduled when date/time changes
    updateData.status = 'rescheduled';
  }
  updateData.scheduled_datetime = scheduledDatetime.toISOString();

  const oldDatetime = beforeVisit.scheduled_datetime;
  const updatedVisit = await repos.updateVisit(visitId, updateData);

  const result = await applyReschedule(repos, participant, updatedVisit, oldDatetime, actor);

  return {
    visit: result.visit,
    canceledJobs: result.canceledJobs,
    createdJobs: result.createdJobs,
    rescheduleEmailJob: result.rescheduleEmailJob,
  };
}

export async function cancelVisit(
  repos: Repositories,
  visitId: string,
  actor: string = 'system'
): Promise<Visit> {
  const beforeVisit = await repos.getVisitById(visitId);
  if (!beforeVisit) {
    throw new Error(`Visit not found: ${visitId}`);
  }

  const participant = await repos.getParticipantById(beforeVisit.participant_id);
  if (!participant) {
    throw new Error(`Participant not found: ${beforeVisit.participant_id}`);
  }

  const visit = await repos.updateVisit(visitId, { status: 'canceled' });

  await repos.cancelReminderJobs(
    participant.id,
    visit.id,
    new Date(visit.scheduled_datetime),
    'visit_canceled'
  );

  return visit;
}
