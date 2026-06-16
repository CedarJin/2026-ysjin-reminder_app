import { describe, it, expect } from 'vitest';
import { createMemoryRepositories } from '../../lib/repositories/memory';
import { parseSpreadsheet } from '../../lib/import/parseSpreadsheet';
import { validateParticipantRow } from '../../lib/import/validateRow';
import { buildImportPreview } from '../../lib/import/buildImportPreview';
import { applyImport } from '../../lib/import/applyImport';
import { seedReminderRulesFromSpec } from '../helpers/seedReminderRules';
import { addDays } from '../../lib/timezone';

describe('importSpreadsheet', () => {
  async function setup() {
    const repos = createMemoryRepositories();
    for (const rule of seedReminderRulesFromSpec()) {
      await repos.createReminderRule(rule);
    }
    return repos;
  }

  it('parses CSV and validates rows', () => {
    const day0Date = addDays(new Date(), 30).toISOString().slice(0, 10);
    const csv = `study_id,first_name,last_name,email,scheduled_day_0_date,scheduled_day_0_time
STUDY-1,Alice,Smith,alice@example.com,${day0Date},09:00
STUDY-1,Bob,Smith,bob@example.com,invalid-date,09:00`;

    const rows = parseSpreadsheet(Buffer.from(csv), 'text/csv');
    expect(rows).toHaveLength(2);

    const validated = rows.map((r) => validateParticipantRow(r));
    expect(validated[0].valid).toBe(true);
    expect(validated[1].valid).toBe(false);
  });

  it('builds import preview and applies import', async () => {
    const repos = await setup();
    const day0Date = addDays(new Date(), 30).toISOString().slice(0, 10);

    const rows = [
      {
        studyId: 'STUDY-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        timezone: 'America/Los_Angeles',
        scheduledDay0Date: day0Date,
        scheduledDay0Time: '09:00',
      },
    ];

    const preview = await buildImportPreview(repos, rows);
    expect(preview.summary.newParticipants).toBe(1);
    expect(preview.summary.newVisits).toBe(1);

    const result = await applyImport(repos, rows);
    expect(result.participantsCreated).toBe(1);
    expect(result.visitsCreated).toBe(1);

    const participants = await repos.listParticipants();
    expect(participants).toHaveLength(1);

    const visits = await repos.listVisitsByParticipantId(participants[0].id);
    expect(visits).toHaveLength(1);
  });

  it('detects rescheduled visits on second import', async () => {
    const repos = await setup();
    const day0Date = addDays(new Date(), 30).toISOString().slice(0, 10);
    const newDay0Date = addDays(new Date(), 35).toISOString().slice(0, 10);

    const rows = [
      {
        studyId: 'STUDY-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        timezone: 'America/Los_Angeles',
        scheduledDay0Date: day0Date,
        scheduledDay0Time: '09:00',
      },
    ];

    await applyImport(repos, rows);

    const updatedRows = [
      {
        ...rows[0],
        scheduledDay0Date: newDay0Date,
      },
    ];

    const preview = await buildImportPreview(repos, updatedRows);
    expect(preview.summary.rescheduledVisits).toBe(1);

    const result = await applyImport(repos, updatedRows);
    expect(result.visitsRescheduled).toBe(1);
  });
});
