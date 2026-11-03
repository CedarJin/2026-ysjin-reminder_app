import { describe, it, expect } from 'vitest';
import { createMemoryRepositories } from '../../lib/repositories/memory';
import { createParticipant } from '../../lib/services/participantService';
import { createVisit, updateVisit } from '../../lib/services/visitService';
import { detectReschedule } from '../../lib/services/rescheduleDetector';
import { seedReminderRulesFromSpec } from '../helpers/seedReminderRules';
import { addDays } from '../../lib/timezone';
import { Visit } from '../../lib/db/schema';

describe('rescheduleDetector', () => {
  async function setup() {
    const repos = createMemoryRepositories();
    for (const rule of seedReminderRulesFromSpec()) {
      await repos.createReminderRule(rule);
    }
    return repos;
  }

  describe('detectReschedule', () => {
    it('detects new visit', () => {
      const visit: Visit = {
        id: 'v1',
        participant_id: 'p1',
        study_id: 's1',
        visit_day: 0,
        visit_name: 'Day 0',
        scheduled_date: '2026-08-12',
        scheduled_time: '09:00',
        scheduled_datetime: '2026-08-12T16:00:00.000Z',
        timezone: 'America/Los_Angeles',
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(detectReschedule({ previousVisit: null, newVisit: visit })).toBe('new_visit');
    });

    it('detects rescheduled visit', () => {
      const previous: Visit = {
        id: 'v1',
        participant_id: 'p1',
        study_id: 's1',
        visit_day: 0,
        visit_name: 'Day 0',
        scheduled_date: '2026-08-12',
        scheduled_time: '09:00',
        scheduled_datetime: '2026-08-12T16:00:00.000Z',
        timezone: 'America/Los_Angeles',
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const current: Visit = { ...previous, scheduled_date: '2026-08-13', scheduled_datetime: '2026-08-13T16:00:00.000Z' };
      expect(detectReschedule({ previousVisit: previous, newVisit: current })).toBe('rescheduled');
    });

    it('detects unchanged visit', () => {
      const previous: Visit = {
        id: 'v1',
        participant_id: 'p1',
        study_id: 's1',
        visit_day: 0,
        visit_name: 'Day 0',
        scheduled_date: '2026-08-12',
        scheduled_time: '09:00',
        scheduled_datetime: '2026-08-12T16:00:00.000Z',
        timezone: 'America/Los_Angeles',
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(detectReschedule({ previousVisit: previous, newVisit: previous })).toBe('unchanged');
    });
  });

  describe('updateVisit reschedule flow', () => {
    it.each([0, 90, 180] as const)('creates only a new scheduling confirmation for Day %s', async (visitDay) => {
      const repos = await setup();
      const participant = await createParticipant(repos, {
        studyId: 'STUDY-1', firstName: 'Test', lastName: 'Participant',
        email: 'test@example.com', timezone: 'America/Los_Angeles',
      });
      const { visit } = await createVisit(repos, {
        participantId: participant.id, studyId: participant.study_id,
        visitDay, visitName: `Day ${visitDay}`, scheduledDate: '2026-10-30', scheduledTime: '11:00',
      });
      const jobs = await repos.listReminderJobs({ participantId: participant.id });
      const scheduling = jobs.find(j => j.rule_id === `day${visitDay}_scheduling`)!;
      await repos.updateReminderJob(scheduling.id, { status: 'sent' });
      const result = await updateVisit(repos, visit.id, { scheduledDate: '2026-11-09', scheduledTime: '09:30' });
      expect(result.rescheduleEmailJob).toBeNull();
      const confirmations = result.createdJobs.filter(j => j.template_id === `day${visitDay}_scheduling`);
      expect(confirmations).toHaveLength(1);
      expect(confirmations[0].visit_date_snapshot).toBe('2026-11-09');
      expect(confirmations[0].visit_time_snapshot).toBe('09:30');
      expect((await repos.listReminderJobs({ participantId: participant.id }))
        .some(j => j.template_id.endsWith('_rescheduling'))).toBe(false);
    });

    it('returns Day 180 to a canceled date and leaves reminders intact on retry', async () => {
      const repos = await setup();
      const participant = await createParticipant(repos, {
        studyId: 'STUDY-1', firstName: 'Test', lastName: 'Participant',
        email: 'test@example.com', timezone: 'America/Los_Angeles',
      });
      const { visit } = await createVisit(repos, {
        participantId: participant.id, studyId: participant.study_id,
        visitDay: 180, visitName: 'Day 180', scheduledDate: '2026-11-09', scheduledTime: '09:30',
      });
      await updateVisit(repos, visit.id, { scheduledDate: '2026-10-30', scheduledTime: '11:00' });
      const jobs = await repos.listReminderJobs({ participantId: participant.id });
      const scheduling = jobs.find(j => j.rule_id === 'day180_scheduling' && j.status === 'scheduled')!;
      // PostgreSQL returns timestamps with +00:00 instead of .000Z.
      await repos.updateReminderJob(scheduling.id, {
        status: 'sent', visit_datetime_snapshot: scheduling.visit_datetime_snapshot!.replace('.000Z', '+00:00'),
      });
      const result = await updateVisit(repos, visit.id, {
        scheduledDate: '2026-11-09', scheduledTime: '09:30',
      });
      expect(result.createdJobs).toHaveLength(2);
      expect(result.rescheduleEmailJob).toBeNull();
      const beforeRetry = await repos.listReminderJobs({ participantId: participant.id });
      const retry = await updateVisit(repos, visit.id, {
        scheduledDate: '2026-11-09', scheduledTime: '09:30',
      });
      expect(retry.canceledJobs).toBe(0);
      expect(retry.createdJobs).toHaveLength(0);
      expect(retry.rescheduleEmailJob).toBeNull();
      expect(await repos.listReminderJobs({ participantId: participant.id })).toEqual(beforeRetry);
      await expect(repos.createReminderJob({ ...result.createdJobs[0], reminder_id: 'duplicate' }))
        .rejects.toThrow('Duplicate reminder job');
    });

    it('cancels old Day 0 reminders and creates new ones on reschedule', async () => {
      const repos = await setup();

      const participant = await createParticipant(repos, {
        studyId: 'STUDY-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        timezone: 'America/Los_Angeles',
      });

      const day0Date = addDays(new Date(), 30);
      const { visit: day0Visit } = await createVisit(repos, {
        participantId: participant.id,
        studyId: participant.study_id,
        visitDay: 0,
        visitName: 'Day 0',
        scheduledDate: day0Date.toISOString().slice(0, 10),
        scheduledTime: '09:00',
      });

      const jobsBefore = await repos.listReminderJobs({ participantId: participant.id });
      expect(jobsBefore.length).toBeGreaterThan(0);

      const newDate = addDays(new Date(), 35);
      const { canceledJobs, createdJobs, rescheduleEmailJob } = await updateVisit(
        repos,
        day0Visit.id,
        {
          scheduledDate: newDate.toISOString().slice(0, 10),
          scheduledTime: '10:00',
        }
      );

      expect(canceledJobs).toBeGreaterThan(0);
      expect(createdJobs.length).toBeGreaterThan(0);
      expect(rescheduleEmailJob).toBeNull(); // original scheduling email was not sent yet

      const jobsAfter = await repos.listReminderJobs({ participantId: participant.id });
      const canceled = jobsAfter.filter((j) => j.status === 'canceled');
      const scheduled = jobsAfter.filter((j) => j.status === 'scheduled');

      expect(canceled.length).toBe(canceledJobs);
      expect(scheduled.length).toBeGreaterThan(0);
    });

    it('does not create a separate reschedule email when original scheduling email was sent', async () => {
      const repos = await setup();

      const participant = await createParticipant(repos, {
        studyId: 'STUDY-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        timezone: 'America/Los_Angeles',
      });

      const day0Date = addDays(new Date(), 30);
      const { visit: day0Visit } = await createVisit(repos, {
        participantId: participant.id,
        studyId: participant.study_id,
        visitDay: 0,
        visitName: 'Day 0',
        scheduledDate: day0Date.toISOString().slice(0, 10),
        scheduledTime: '09:00',
      });

      // Mark the original scheduling email as sent
      const jobs = await repos.listReminderJobs({ participantId: participant.id });
      const schedulingJob = jobs.find((j) => j.rule_id === 'day0_scheduling');
      expect(schedulingJob).toBeDefined();
      await repos.updateReminderJob(schedulingJob!.id, { status: 'sent', sent_at: new Date().toISOString() });

      const newDate = addDays(new Date(), 35);
      const { rescheduleEmailJob } = await updateVisit(repos, day0Visit.id, {
        scheduledDate: newDate.toISOString().slice(0, 10),
        scheduledTime: '10:00',
      });

      expect(rescheduleEmailJob).toBeNull();
    });
  });
});
