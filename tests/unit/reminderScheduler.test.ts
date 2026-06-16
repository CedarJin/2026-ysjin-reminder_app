import { describe, it, expect } from 'vitest';
import { createMemoryRepositories } from '../../lib/repositories/memory';
import { createParticipant } from '../../lib/services/participantService';
import { generateReminderJobs } from '../../lib/services/reminderScheduler';
import { seedReminderRulesFromSpec } from '../helpers/seedReminderRules';
import { addDays } from '../../lib/timezone';
import { Visit } from '../../lib/db/schema';

describe('reminderScheduler', () => {
  async function setup() {
    const repos = createMemoryRepositories();
    for (const rule of seedReminderRulesFromSpec()) {
      await repos.createReminderRule(rule);
    }
    return repos;
  }

  it('creates all Day 0 reminder jobs when Day 0 visit is scheduled', async () => {
    const repos = await setup();

    const participant = await createParticipant(repos, {
      studyId: 'STUDY-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      timezone: 'America/Los_Angeles',
    });

    const futureDate = addDays(new Date(), 30);
    const dateStr = futureDate.toISOString().slice(0, 10);

    const visit: Visit = {
      id: 'visit-day0',
      participant_id: participant.id,
      study_id: participant.study_id,
      visit_day: 0,
      visit_name: 'Day 0',
      scheduled_date: dateStr,
      scheduled_time: '09:00',
      scheduled_datetime: `${dateStr}T16:00:00.000Z`,
      timezone: participant.timezone,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const activeRules = await repos.listActiveReminderRules();
    const { created, skipped } = await generateReminderJobs(
      repos,
      participant,
      [visit],
      activeRules
    );

    const createdRuleIds = created.map((j) => j.rule_id);
    expect(createdRuleIds).toContain('day0_scheduling');
    expect(createdRuleIds).toContain('day0_patternized_diet');
    expect(createdRuleIds).toContain('day0_visit_reminder');
    expect(createdRuleIds).toContain('week6_habitual_diet');
    expect(createdRuleIds).toContain('week18_habitual_diet');

    const skippedRuleIds = skipped.map((s) => s.rule.rule_id);
    expect(skippedRuleIds).toContain('day90_scheduling');
    expect(skippedRuleIds).toContain('day180_scheduling');
  });

  it('creates all 10 standard jobs when all visits are scheduled', async () => {
    const repos = await setup();

    const participant = await createParticipant(repos, {
      studyId: 'STUDY-1',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      timezone: 'America/Los_Angeles',
    });

    const day0Date = addDays(new Date(), 30);
    const day90Date = addDays(new Date(), 120);
    const day180Date = addDays(new Date(), 210);

    const day0Visit: Visit = {
      id: 'visit-day0',
      participant_id: participant.id,
      study_id: participant.study_id,
      visit_day: 0,
      visit_name: 'Day 0',
      scheduled_date: day0Date.toISOString().slice(0, 10),
      scheduled_time: '09:00',
      scheduled_datetime: `${day0Date.toISOString().slice(0, 10)}T16:00:00.000Z`,
      timezone: participant.timezone,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const day90Visit: Visit = {
      id: 'visit-day90',
      participant_id: participant.id,
      study_id: participant.study_id,
      visit_day: 90,
      visit_name: 'Day 90',
      scheduled_date: day90Date.toISOString().slice(0, 10),
      scheduled_time: '13:00',
      scheduled_datetime: `${day90Date.toISOString().slice(0, 10)}T21:00:00.000Z`,
      timezone: participant.timezone,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const day180Visit: Visit = {
      id: 'visit-day180',
      participant_id: participant.id,
      study_id: participant.study_id,
      visit_day: 180,
      visit_name: 'Day 180',
      scheduled_date: day180Date.toISOString().slice(0, 10),
      scheduled_time: '09:00',
      scheduled_datetime: `${day180Date.toISOString().slice(0, 10)}T17:00:00.000Z`,
      timezone: participant.timezone,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const activeRules = await repos.listActiveReminderRules();
    const { created } = await generateReminderJobs(
      repos,
      participant,
      [day0Visit, day90Visit, day180Visit],
      activeRules
    );

    const createdRuleIds = created.map((j) => j.rule_id);
    expect(createdRuleIds).toHaveLength(10);
    expect(createdRuleIds).toContain('day0_scheduling');
    expect(createdRuleIds).toContain('day90_scheduling');
    expect(createdRuleIds).toContain('day180_scheduling');
  });
});
