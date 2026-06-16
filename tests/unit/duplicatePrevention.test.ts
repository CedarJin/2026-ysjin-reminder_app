import { describe, it, expect } from 'vitest';
import { createMemoryRepositories } from '../../lib/repositories/memory';
import { seedReminderRulesFromSpec } from '../helpers/seedReminderRules';

describe('duplicatePrevention', () => {
  it('does not create duplicate reminder jobs', async () => {
    const repos = createMemoryRepositories();
    for (const rule of seedReminderRulesFromSpec()) {
      await repos.createReminderRule(rule);
    }

    const sendDatetime = '2026-08-12T16:00:00.000Z';
    const visitSnapshot = '2026-08-12T16:00:00.000Z';

    const first = await repos.createReminderJob({
      reminder_id: 'rem_1',
      participant_id: 'p1',
      study_id: 'STUDY-1',
      visit_id: null,
      phase: 'day0',
      rule_id: 'day0_scheduling',
      email_name: 'Scheduling: Day 0',
      template_id: 'day0_scheduling',
      scheduled_send_date: '2026-08-12',
      scheduled_send_time: '09:00',
      scheduled_send_datetime: sendDatetime,
      visit_date_snapshot: '2026-08-12',
      visit_time_snapshot: '09:00',
      visit_datetime_snapshot: visitSnapshot,
      status: 'scheduled',
      sent_at: null,
      canceled_at: null,
      canceled_reason: null,
      provider_message_id: null,
      last_error: null,
    });

    const duplicate = await repos.findEquivalentReminderJob(
      'p1',
      'day0_scheduling',
      sendDatetime,
      visitSnapshot
    );

    expect(duplicate).not.toBeNull();
    expect(duplicate!.id).toBe(first.id);
  });

  it('allows new job after original is canceled', async () => {
    const repos = createMemoryRepositories();
    for (const rule of seedReminderRulesFromSpec()) {
      await repos.createReminderRule(rule);
    }

    const sendDatetime = '2026-08-12T16:00:00.000Z';
    const visitSnapshot = '2026-08-12T16:00:00.000Z';

    const first = await repos.createReminderJob({
      reminder_id: 'rem_1',
      participant_id: 'p1',
      study_id: 'STUDY-1',
      visit_id: null,
      phase: 'day0',
      rule_id: 'day0_scheduling',
      email_name: 'Scheduling: Day 0',
      template_id: 'day0_scheduling',
      scheduled_send_date: '2026-08-12',
      scheduled_send_time: '09:00',
      scheduled_send_datetime: sendDatetime,
      visit_date_snapshot: '2026-08-12',
      visit_time_snapshot: '09:00',
      visit_datetime_snapshot: visitSnapshot,
      status: 'scheduled',
      sent_at: null,
      canceled_at: null,
      canceled_reason: null,
      provider_message_id: null,
      last_error: null,
    });

    await repos.updateReminderJob(first.id, { status: 'canceled' });

    const duplicate = await repos.findEquivalentReminderJob(
      'p1',
      'day0_scheduling',
      sendDatetime,
      visitSnapshot
    );

    expect(duplicate).toBeNull();
  });
});
