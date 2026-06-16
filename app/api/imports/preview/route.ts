import { NextRequest, NextResponse } from 'next/server';
import { parseSpreadsheet } from '@/lib/import/parseSpreadsheet';
import { validateParticipantRow } from '@/lib/import/validateRow';
import { buildImportPreview } from '@/lib/import/buildImportPreview';
import { supabaseRepositories } from '@/lib/repositories/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const rows = parseSpreadsheet(buffer, file.type || file.name);

    const validatedRows = rows.map((row) => validateParticipantRow(row));
    const validRows = validatedRows
      .filter((r) => r.valid && r.data)
      .map((r) => r.data!);
    const invalidRows = validatedRows
      .filter((r) => !r.valid)
      .map((r, index) => ({ index, errors: r.errors, warnings: r.warnings }));

    const preview = await buildImportPreview(supabaseRepositories, validRows);

    return NextResponse.json({
      preview,
      validRows,
      invalidRows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
