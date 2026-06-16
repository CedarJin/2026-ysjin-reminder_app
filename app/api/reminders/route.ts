import { NextRequest, NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId') || undefined;
    const status = searchParams.get('status') as
      | 'scheduled'
      | 'pending_review'
      | 'sent'
      | 'failed'
      | 'canceled'
      | 'skipped'
      | undefined;
    const phase = searchParams.get('phase') || undefined;

    const jobs = await supabaseRepositories.listReminderJobs({
      participantId,
      status,
      phase,
    });

    return NextResponse.json(jobs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
