import { Repositories } from '../repositories/types';
import { Participant } from '../db/schema';
import { logAudit } from './auditLogger';

export interface CreateParticipantInput {
  participantId?: string | null;
  studyId: string;
  firstName: string;
  lastName: string;
  email: string;
  timezone?: string;
  notes?: string | null;
}

export interface UpdateParticipantInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  timezone?: string;
  status?: Participant['status'];
  emailOptOut?: boolean;
  notes?: string | null;
}

export function buildParticipantKey(studyId: string, email: string): string {
  return `${studyId}:${email}`;
}

export async function createParticipant(
  repos: Repositories,
  input: CreateParticipantInput,
  actor: string = 'system'
): Promise<Participant> {
  const participantKey = buildParticipantKey(input.studyId, input.email);

  const existing = await repos.getParticipantByKey(participantKey);
  if (existing) {
    throw new Error(`Participant already exists for study ${input.studyId} and email ${input.email}`);
  }

  const participant = await repos.createParticipant({
    participant_key: participantKey,
    participant_id: input.participantId || null,
    study_id: input.studyId,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    timezone: input.timezone || 'America/Los_Angeles',
    status: 'active',
    email_opt_out: false,
    notes: input.notes || null,
  });

  await logAudit(repos, {
    actor,
    action: 'participant_created',
    entityType: 'participant',
    entityId: participant.id,
    participantId: participant.id,
    after: participant as unknown as Record<string, unknown>,
  });

  return participant;
}

export async function updateParticipant(
  repos: Repositories,
  participantId: string,
  input: UpdateParticipantInput,
  actor: string = 'system'
): Promise<Participant> {
  const before = await repos.getParticipantById(participantId);
  if (!before) {
    throw new Error(`Participant not found: ${participantId}`);
  }

  const updateData: Partial<Participant> = {};
  if (input.firstName !== undefined) updateData.first_name = input.firstName;
  if (input.lastName !== undefined) updateData.last_name = input.lastName;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.emailOptOut !== undefined) updateData.email_opt_out = input.emailOptOut;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const participant = await repos.updateParticipant(participantId, updateData);

  let action = 'participant_updated';
  if (input.status === 'paused') action = 'participant_paused';
  if (input.status === 'active' && before.status === 'paused') action = 'participant_resumed';
  if (input.status === 'withdrawn') action = 'participant_withdrawn';
  if (input.status === 'completed') action = 'participant_completed';

  await logAudit(repos, {
    actor,
    action,
    entityType: 'participant',
    entityId: participant.id,
    participantId: participant.id,
    before: before as unknown as Record<string, unknown>,
    after: participant as unknown as Record<string, unknown>,
  });

  return participant;
}

export async function getParticipantWithRelated(
  repos: Repositories,
  participantId: string
): Promise<{
  participant: Participant;
  visits: Awaited<ReturnType<Repositories['listVisitsByParticipantId']>>;
  events: Awaited<ReturnType<Repositories['listCalculatedEventsByParticipantId']>>;
  jobs: Awaited<ReturnType<Repositories['listReminderJobs']>>;
}> {
  const participant = await repos.getParticipantById(participantId);
  if (!participant) {
    throw new Error(`Participant not found: ${participantId}`);
  }

  const [visits, events, jobs] = await Promise.all([
    repos.listVisitsByParticipantId(participantId),
    repos.listCalculatedEventsByParticipantId(participantId),
    repos.listReminderJobs({ participantId }),
  ]);

  return { participant, visits, events, jobs };
}

export async function listParticipants(
  repos: Repositories,
  filters?: Parameters<Repositories['listParticipants']>[0]
): Promise<Participant[]> {
  return repos.listParticipants(filters);
}
