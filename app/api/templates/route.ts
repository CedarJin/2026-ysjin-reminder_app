import { NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';

export async function GET() {
  try {
    const templates = await supabaseRepositories.listEmailTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
