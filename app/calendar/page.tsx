'use client';

import Link from 'next/link';

export default function CalendarPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white p-8 rounded-lg shadow text-center">
        <p className="text-gray-600">Calendar view showing visits, calculated events, and scheduled emails.</p>
        <p className="text-sm text-gray-500 mt-2">Filters and full calendar grid will be implemented here.</p>
      </div>
    </main>
  );
}
