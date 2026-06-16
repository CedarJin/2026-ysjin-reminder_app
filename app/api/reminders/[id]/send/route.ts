import { NextRequest, NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';
import { sendReminderJob } from '@/lib/email/emailSender';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sendReminderJob(supabaseRepositories, params.id);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
