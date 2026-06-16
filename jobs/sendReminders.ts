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
      status: 'scheduled',
      dueBefore: now,
    });

    // Only auto-send jobs due within the last minute; older ones need manual review
    const recentJobs = dueJobs.filter((job) => {
      const sendTime = new Date(job.scheduled_send_datetime).getTime();
      return now.getTime() - sendTime < 12 * 60 * 60 * 1000;
    });

    io.logger.info(`Found ${dueJobs.length} due, ${recentJobs.length} auto-sent, ${dueJobs.length - recentJobs.length} overdue (manual)`);

    for (const job of recentJobs) {
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

    return { processed: recentJobs.length, overdue: dueJobs.length - recentJobs.length };
  },
});
