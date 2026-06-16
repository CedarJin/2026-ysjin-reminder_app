import { NextRequest, NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';
import {
  createParticipant,
  listParticipants,
} from '@/lib/services/participantService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId') || undefined;
    const status = searchParams.get('status') as
      | 'active'
      | 'paused'
      | 'withdrawn'
      | 'completed'
      | undefined;
    const search = searchParams.get('search') || undefined;

    const participants = await listParticipants(supabaseRepositories, {
      studyId,
      status,
      search,
    });

    return NextResponse.json(participants);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const participant = await createParticipant(supabaseRepositories, {
      participantId: body.participantId,
      studyId: body.studyId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      timezone: body.timezone,
      notes: body.notes,
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
