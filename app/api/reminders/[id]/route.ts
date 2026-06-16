import { NextRequest, NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.scheduled_send_date !== undefined) updateData.scheduled_send_date = body.scheduled_send_date;
    if (body.scheduled_send_time !== undefined) updateData.scheduled_send_time = body.scheduled_send_time;
    if (body.scheduled_send_datetime !== undefined) updateData.scheduled_send_datetime = body.scheduled_send_datetime;
    if (body.template_id !== undefined) updateData.template_id = body.template_id;
    if (body.status !== undefined) updateData.status = body.status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const job = await supabaseRepositories.updateReminderJob(params.id, updateData);
    return NextResponse.json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
