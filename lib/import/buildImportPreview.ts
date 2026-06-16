import { Repositories } from '../repositories/types';
import { Participant, Visit } from '../db/schema';
import { NormalizedImportRow } from './validateRow';
import { buildParticipantKey } from '../services/participantService';
import { combineDateAndTime } from '../timezone';

export interface ImportPreview {
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    newParticipants: number;
    updatedParticipants: number;
    newVisits: number;
    updatedVisits: number;
    rescheduledVisits: number;
    reminderJobsToCreate: number;
    reminderJobsToCancel: number;
    rescheduleEmailsToCreate: number;
  };
  rows: Array<{
    index: number;
    valid: boolean;
    errors: string[];
    warnings: string[];
    participantAction?: 'new' | 'updated' | 'unchanged';
    visitActions?: Array<{
      visitDay: number;
      action: 'new' | 'updated' | 'rescheduled' | 'unchanged';
    }>;
  }>;
}

export async function buildImportPreview(
  repos: Repositories,
  rows: NormalizedImportRow[]
): Promise<ImportPreview> {
  const preview: ImportPreview = {
    summary: {
      totalRows: rows.length,
      validRows: 0,
      invalidRows: 0,
      newParticipants: 0,
      updatedParticipants: 0,
      newVisits: 0,
      updatedVisits: 0,
      rescheduledVisits: 0,
      reminderJobsToCreate: 0,
      reminderJobsToCancel: 0,
      rescheduleEmailsToCreate: 0,
    },
    rows: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowPreview: ImportPreview['rows'][number] = {
      index: i,
      valid: true,
      errors: [],
      warnings: [],
    };

    const participantKey = buildParticipantKey(row.studyId, row.email);
    const existingParticipant = await repos.getParticipantByKey(participantKey);

    if (!existingParticipant) {
      rowPreview.participantAction = 'new';
      preview.summary.newParticipants++;
    } else {
      const hasChanges =
        existingParticipant.first_name !== row.firstName ||
        existingParticipant.last_name !== row.lastName ||
        existingParticipant.email !== row.email ||
        existingParticipant.timezone !== row.timezone;

      rowPreview.participantAction = hasChanges ? 'updated' : 'unchanged';
      if (hasChanges) preview.summary.updatedParticipants++;
    }

    const participant = existingParticipant || ({
      id: 'preview',
      participant_key: participantKey,
      participant_id: row.participantId || null,
      study_id: row.studyId,
      first_name: row.firstName,
      last_name: row.lastName,
      email: row.email,
      timezone: row.timezone,
      status: (row.status as Participant['status']) || 'active',
      email_opt_out: row.emailOptOut || false,
      notes: row.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Participant);

    rowPreview.visitActions = [];

    const visitInputs: Array<{ day: 0 | 90 | 180; date?: string; time?: string }> = [
      { day: 0, date: row.scheduledDay0Date, time: row.scheduledDay0Time },
      { day: 90, date: row.scheduledDay90Date, time: row.scheduledDay90Time },
      { day: 180, date: row.scheduledDay180Date, time: row.scheduledDay180Time },
    ];

    for (const { day, date, time } of visitInputs) {
      if (!date || !time) continue;

      const existingVisit = existingParticipant
        ? await repos.getVisitByParticipantAndDay(existingParticipant.id, day)
        : null;

      if (!existingVisit) {
        rowPreview.visitActions.push({ visitDay: day, action: 'new' });
        preview.summary.newVisits++;
        preview.summary.reminderJobsToCreate += estimateJobsForVisit(day);
      } else {
        const newDatetime = combineDateAndTime(date, time, participant.timezone).toISOString();
        if (existingVisit.scheduled_datetime !== newDatetime) {
          rowPreview.visitActions.push({ visitDay: day, action: 'rescheduled' });
          preview.summary.rescheduledVisits++;
          preview.summary.reminderJobsToCancel += estimateJobsForVisit(day);
          preview.summary.reminderJobsToCreate += estimateJobsForVisit(day);

          const hasSentSchedulingEmail = await checkSentSchedulingEmail(repos, existingVisit.id, day);
          if (hasSentSchedulingEmail) {
            preview.summary.rescheduleEmailsToCreate++;
          }
        } else {
          rowPreview.visitActions.push({ visitDay: day, action: 'unchanged' });
        }
      }
    }

    preview.summary.validRows++;
    preview.rows.push(rowPreview);
  }

  return preview;
}

function estimateJobsForVisit(visitDay: number): number {
  switch (visitDay) {
    case 0:
      return 5; // scheduling, patternized diet, visit reminder, week6, week18
    case 90:
      return 3; // scheduling, patternized diet, visit reminder
    case 180:
      return 2; // scheduling, visit reminder
    default:
      return 0;
  }
}

async function checkSentSchedulingEmail(
  repos: Repositories,
  visitId: string,
  visitDay: number
): Promise<boolean> {
  const schedulingRuleId = visitDay === 0 ? 'day0_scheduling' : visitDay === 90 ? 'day90_scheduling' : 'day180_scheduling';
  const jobs = await repos.listReminderJobs({ status: 'sent' });
  return jobs.some((j) => j.visit_id === visitId && j.rule_id === schedulingRuleId);
}
