import { describe, it, expect } from 'vitest';
import { createMemoryRepositories } from '../../lib/repositories/memory';
import { sendReminderJob } from '../../lib/email/emailSender';
import { ReminderJob } from '../../lib/db/schema';

describe('legacy reschedule emails', () => {
  it.each(['scheduled', 'pending_review'] as const)('suppresses a %s job before contacting the email provider', async (status) => {
    const repos = createMemoryRepositories();
    const job = await repos.createReminderJob({
      reminder_id: 'legacy', participant_id: 'p1', rule_id: 'day90_scheduling_reschedule',
      template_id: 'day90_rescheduling', status,
      scheduled_send_datetime: new Date().toISOString(), visit_datetime_snapshot: null,
    } as Omit<ReminderJob, 'id' | 'created_at' | 'updated_at'>);
    const result = await sendReminderJob(repos, job.id);
    expect(result.status).toBe('skipped');
    expect(result.error).toBe('Separate reschedule emails are disabled');
    expect((await repos.getReminderJobById(job.id))?.status).toBe('skipped');
  });
});
