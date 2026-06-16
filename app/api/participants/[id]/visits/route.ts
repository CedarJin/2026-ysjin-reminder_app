import { NextRequest, NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';
import { createVisit } from '@/lib/services/visitService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const result = await createVisit(supabaseRepositories, {
      participantId: params.id,
      studyId: body.studyId,
      visitDay: body.visitDay,
      visitName: body.visitName,
      scheduledDate: body.scheduledDate,
      scheduledTime: body.scheduledTime,
      timezone: body.timezone,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
