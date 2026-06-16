'use client';

import { useEffect, useState } from 'react';
import SummaryCards from '@/components/dashboard/SummaryCards';
import ParticipantTable from '@/components/dashboard/ParticipantTable';
import Link from 'next/link';

export default function DashboardPage() {
  const [participants, setParticipants] = useState([]);
  const [counts, setCounts] = useState({
    totalActive: 0,
    emailsToday: 0,
    upcomingVisitsThisWeek: 0,
    missingDay90: 0,
    missingDay180: 0,
    failedEmails: 0,
    recentReschedules: 0,
    needsAttention: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/participants?status=active').then((r) => r.json()),
      fetch('/api/dashboard/stats').then((r) => r.json()).catch(() => null),
    ]).then(([participants, stats]) => {
      setParticipants(participants);
      if (stats) setCounts(stats);
      setLoading(false);
    }).catch(() => {
      // Fallback: at least show participants
      setLoading(false);
    });
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="space-x-4">
          <Link
            href="/participants"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Participants
          </Link>
          <Link
            href="/reminders"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Reminders
          </Link>
          <Link
            href="/imports"
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Import
          </Link>
        </div>
      </div>

      <SummaryCards counts={counts} />

      <h2 className="text-lg font-semibold mb-4">Active Participants</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ParticipantTable participants={participants} />
      )}
    </main>
  );
}
