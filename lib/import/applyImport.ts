import { Repositories } from '../repositories/types';
import { NormalizedImportRow } from './validateRow';
import {
  createParticipant,
  updateParticipant,
  buildParticipantKey,
} from '../services/participantService';
import { createVisit, updateVisit } from '../services/visitService';
import { logAudit } from '../services/auditLogger';

export interface ApplyImportResult {
  participantsCreated: number;
  participantsUpdated: number;
  visitsCreated: number;
  visitsRescheduled: number;
}

export async function applyImport(
  repos: Repositories,
  rows: NormalizedImportRow[],
  actor: string = 'system'
): Promise<ApplyImportResult> {
  const result: ApplyImportResult = {
    participantsCreated: 0,
    participantsUpdated: 0,
    visitsCreated: 0,
    visitsRescheduled: 0,
  };

  for (const row of rows) {
    const participantKey = buildParticipantKey(row.studyId, row.email);
    const existingParticipant = await repos.getParticipantByKey(participantKey);

    let participant;
    if (!existingParticipant) {
      participant = await createParticipant(
        repos,
        {
          participantId: row.participantId,
          studyId: row.studyId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          timezone: row.timezone,
          notes: row.notes,
        },
        actor
      );
      result.participantsCreated++;
    } else {
      const hasChanges =
        existingParticipant.first_name !== row.firstName ||
        existingParticipant.last_name !== row.lastName ||
        existingParticipant.email !== row.email ||
        existingParticipant.timezone !== row.timezone;

      if (hasChanges) {
        participant = await updateParticipant(
          repos,
          existingParticipant.id,
          {
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            timezone: row.timezone,
          },
          actor
        );
        result.participantsUpdated++;
      } else {
        participant = existingParticipant;
      }
    }

    const visitsToProcess: Array<{ day: 0 | 90 | 180; date?: string; time?: string }> = [
      { day: 0, date: row.scheduledDay0Date, time: row.scheduledDay0Time },
      { day: 90, date: row.scheduledDay90Date, time: row.scheduledDay90Time },
      { day: 180, date: row.scheduledDay180Date, time: row.scheduledDay180Time },
    ];

    for (const { day, date, time } of visitsToProcess) {
      if (!date || !time) continue;

      const existingVisit = await repos.getVisitByParticipantAndDay(participant.id, day);

      if (!existingVisit) {
        await createVisit(
          repos,
          {
            participantId: participant.id,
            studyId: participant.study_id,
            visitDay: day,
            visitName: `Day ${day}`,
            scheduledDate: date,
            scheduledTime: time,
            timezone: participant.timezone,
          },
          actor
        );
        result.visitsCreated++;
      } else {
        const newDatetime = `${date}T${time}:00`;
        const oldDatetime = existingVisit.scheduled_datetime;

        if (oldDatetime !== newDatetime) {
          await updateVisit(
            repos,
            existingVisit.id,
            {
              scheduledDate: date,
              scheduledTime: time,
              timezone: participant.timezone,
            },
            actor
          );
          result.visitsRescheduled++;
        }
      }
    }
  }

  await logAudit(repos, {
    actor,
    action: 'spreadsheet_import_confirmed',
    entityType: 'spreadsheet_import',
    before: null,
    after: result as unknown as Record<string, unknown>,
  });

  return result;
}
