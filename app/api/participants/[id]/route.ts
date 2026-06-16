import { NextRequest, NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';
import {
  updateParticipant,
  getParticipantWithRelated,
} from '@/lib/services/participantService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getParticipantWithRelated(supabaseRepositories, params.id);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const participant = await updateParticipant(supabaseRepositories, params.id, {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      timezone: body.timezone,
      status: body.status,
      emailOptOut: body.emailOptOut,
      notes: body.notes,
    });

    return NextResponse.json(participant);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
