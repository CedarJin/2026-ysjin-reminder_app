import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedRow {
  [key: string]: string | undefined;
}

export function parseSpreadsheet(buffer: Buffer, fileType: string): ParsedRow[] {
  if (fileType === 'text/csv' || fileType.endsWith('.csv')) {
    return parseCsv(buffer);
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType.endsWith('.xlsx')
  ) {
    return parseXlsx(buffer);
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

function parseCsv(buffer: Buffer): ParsedRow[] {
  const text = buffer.toString('utf-8');
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  return (result.data as Record<string, string>[]).map((row) => normalizeRow(row));
}

function parseXlsx(buffer: Buffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((h) => String(h).trim().toLowerCase().replace(/\s+/g, '_'));

  return rows.slice(1).map((row) => {
    const obj: ParsedRow = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] !== undefined ? String(row[index]) : undefined;
    });
    return normalizeRow(obj);
  });
}

function normalizeRow(row: Record<string, string | undefined>): ParsedRow {
  const normalized: ParsedRow = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = value?.trim() || undefined;
  }
  return normalized;
}
