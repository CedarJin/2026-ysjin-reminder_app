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

    it('creates a reschedule email when original scheduling email was sent', async () => {
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

      expect(rescheduleEmailJob).not.toBeNull();
      expect(rescheduleEmailJob!.template_id).toBe('day0_rescheduling');
    });
  });
});
