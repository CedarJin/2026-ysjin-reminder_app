'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ImportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/imports/preview', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setPreview(data);
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!preview?.validRows) return;

    setLoading(true);
    await fetch('/api/imports/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: preview.validRows }),
    });

    setPreview(null);
    setFile(null);
    setLoading(false);
    alert('Import completed');
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Import Participants</h1>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Back to Dashboard
        </Link>
      </div>

      <form onSubmit={handleUpload} className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Spreadsheet (CSV or XLSX)</label>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1 block w-full"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Preview Import'}
        </button>
      </form>

      {preview && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Import Preview</h2>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(preview.preview.summary, null, 2)}
          </pre>

          {preview.invalidRows.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-red-600">Invalid Rows</h3>
              <ul className="text-sm">
                {preview.invalidRows.map((row: any) => (
                  <li key={row.index}>
                    Row {row.index}: {row.errors.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={loading || preview.validRows.length === 0}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      )}
    </main>
  );
}
