import { NextRequest, NextResponse } from 'next/server';
import { NormalizedImportRow } from '@/lib/import/validateRow';
import { applyImport } from '@/lib/import/applyImport';
import { supabaseRepositories } from '@/lib/repositories/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows: NormalizedImportRow[] = body.rows;

    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: 'Rows array is required' }, { status: 400 });
    }

    const result = await applyImport(supabaseRepositories, rows, body.actor || 'system');

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
