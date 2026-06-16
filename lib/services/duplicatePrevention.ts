import { Repositories } from '../repositories/types';

export interface FindEquivalentJobInput {
  participantId: string;
  ruleId: string;
  scheduledSendDatetime: Date;
  visitDatetimeSnapshot: Date | null;
}

export async function findEquivalentJob(
  repos: Repositories,
  input: FindEquivalentJobInput
): Promise<Awaited<ReturnType<Repositories['findEquivalentReminderJob']>>> {
  return repos.findEquivalentReminderJob(
    input.participantId,
    input.ruleId,
    input.scheduledSendDatetime,
    input.visitDatetimeSnapshot
  );
}

export function isJobDuplicate(
  existingJob: NonNullable<Awaited<ReturnType<Repositories['findEquivalentReminderJob']>>>
): boolean {
  return existingJob.status !== 'canceled';
}
