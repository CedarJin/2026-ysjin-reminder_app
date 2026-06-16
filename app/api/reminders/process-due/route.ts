import { NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';
import { sendReminderJob } from '@/lib/email/emailSender';

export async function GET() {
  try {
    const now = new Date();

    // Fetch all due scheduled jobs
    const dueJobs = await supabaseRepositories.listReminderJobs({
      status: 'scheduled',
      dueBefore: now,
    });

    // Only auto-send jobs that became due within the last 1 minute.
    // Older overdue jobs stay as 'scheduled' for manual review (Send Now).
    const recentJobs = dueJobs.filter((job) => {
      const sendTime = new Date(job.scheduled_send_datetime).getTime();
      return now.getTime() - sendTime < 60000;
    });

    const results: Array<{ id: string; status: string }> = [];

    for (const job of recentJobs) {
      try {
        const result = await sendReminderJob(supabaseRepositories, job.id);
        results.push({ id: job.id, status: result.status });
      } catch {
        results.push({ id: job.id, status: 'error' });
      }
    }

    return NextResponse.json({
      processed: recentJobs.length,
      total_due: dueJobs.length,
      overdue_skipped: dueJobs.length - recentJobs.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
