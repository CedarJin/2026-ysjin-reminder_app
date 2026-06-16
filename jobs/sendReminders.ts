import { cronTrigger } from '@trigger.dev/sdk';
import { triggerClient } from '../lib/trigger';
import { supabaseRepositories } from '../lib/repositories/supabase';
import { sendReminderJob } from '../lib/email/emailSender';

triggerClient.defineJob({
  id: 'send-due-reminders',
  name: 'Send Due Reminder Emails',
  version: '0.0.1',
  trigger: cronTrigger({ cron: '*/5 * * * *' }),
  run: async (_payload, io, _ctx) => {
    const now = new Date();
    const dueJobs = await supabaseRepositories.listReminderJobs({
      status: 'pending_review',
      dueBefore: now,
    });

    // Also pick up scheduled jobs that are due
    const scheduledJobs = await supabaseRepositories.listReminderJobs({
      status: 'scheduled',
      dueBefore: now,
    });

    const allDueJobs = [...dueJobs, ...scheduledJobs];

    io.logger.info(`Found ${allDueJobs.length} due reminder jobs (${dueJobs.length} pending_review, ${scheduledJobs.length} scheduled)`);

    for (const job of allDueJobs) {
      try {
        const result = await sendReminderJob(supabaseRepositories, job.id);
        if (result.success) {
          io.logger.info(`Sent reminder job ${job.id}`, { messageId: result.messageId });
        } else {
          io.logger.error(`Failed to send reminder job ${job.id}`, { error: result.error });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        io.logger.error(`Exception sending reminder job ${job.id}`, { error: message });
      }
    }

    return { processed: allDueJobs.length };
  },
});
