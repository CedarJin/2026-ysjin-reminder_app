import { NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';
import { sendReminderJob } from '@/lib/email/emailSender';

export async function GET() {
  try {
    const now = new Date();

    // Fetch all jobs that are due (scheduled or pending_review)
    const dueJobs = await supabaseRepositories.listReminderJobs({
      status: 'pending_review',
      dueBefore: now,
    });
    const scheduledJobs = await supabaseRepositories.listReminderJobs({
      status: 'scheduled',
      dueBefore: now,
    });

    const allJobs = [...dueJobs, ...scheduledJobs];
    const results: Array<{ id: string; status: string }> = [];

    for (const job of allJobs) {
      try {
        const result = await sendReminderJob(supabaseRepositories, job.id);
        results.push({ id: job.id, status: result.status });
      } catch {
        results.push({ id: job.id, status: 'error' });
      }
    }

    return NextResponse.json({
      processed: allJobs.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
