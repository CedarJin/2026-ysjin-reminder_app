import { NextRequest, NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';
import { updateVisit } from '@/lib/services/visitService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const result = await updateVisit(supabaseRepositories, params.id, {
      scheduledDate: body.scheduledDate,
      scheduledTime: body.scheduledTime,
      timezone: body.timezone,
      status: body.status,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
