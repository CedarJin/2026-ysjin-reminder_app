import { describe, it, expect } from 'vitest';
import {
  renderTemplate,
  validateVariables,
  buildVariableMap,
  extractVariables,
} from '../../lib/email/templateRenderer';
import { Participant, Visit, CalculatedStudyEvent } from '../../lib/db/schema';

describe('templateRenderer', () => {
  it('renders variables in a template', () => {
    const result = renderTemplate('Hi {{first_name}}, visit on {{day0_visit_date}}', {
      first_name: 'Alice',
      day0_visit_date: '2026-08-12',
    });
    expect(result).toBe('Hi Alice, visit on 2026-08-12');
  });

  it('extracts variables from template', () => {
    const variables = extractVariables('Hi {{first_name}} {{last_name}}');
    expect(variables).toEqual(['first_name', 'last_name']);
  });

  it('detects missing variables', () => {
    const { valid, missing } = validateVariables('Hi {{first_name}}, {{missing}}', {
      first_name: 'Alice',
    });
    expect(valid).toBe(false);
    expect(missing).toContain('missing');
  });

  it('builds variable map from participant, visits, and events', () => {
    const participant: Participant = {
      id: 'p1',
      participant_key: 'STUDY-1:alice@example.com',
      participant_id: null,
      study_id: 'STUDY-1',
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@example.com',
      timezone: 'America/Los_Angeles',
      status: 'active',
      email_opt_out: false,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const visits: Visit[] = [
      {
        id: 'v1',
        participant_id: 'p1',
        study_id: 'STUDY-1',
        visit_day: 0,
        visit_name: 'Day 0',
        scheduled_date: '2026-08-12',
        scheduled_time: '09:00',
        scheduled_datetime: '2026-08-12T16:00:00.000Z',
        timezone: 'America/Los_Angeles',
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const events: CalculatedStudyEvent[] = [
      {
        id: 'e1',
        participant_id: 'p1',
        study_id: 'STUDY-1',
        source_visit_day: 0,
        event_key: 'day0_patternized_diet_start',
        event_name: 'Patternized Diet Start',
        event_date: '2026-08-09',
        event_time: null,
        event_datetime: null,
        timezone: 'America/Los_Angeles',
        calculation_rule: 'scheduled_day_0_date - 3 days',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const variables = buildVariableMap(participant, visits, events);
    expect(variables.first_name).toBe('Alice');
    expect(variables.day0_visit_date).toBe('2026-08-12');
    expect(variables.day0_visit_time).toBe('09:00');
    expect(variables.day0_patternized_diet_start_date).toBe('2026-08-09');
  });
});
