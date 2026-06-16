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

  const navLinks = [
    { href: '/participants', label: 'Participants', color: 'btn-primary' },
    { href: '/reminders', label: 'Reminders', color: 'btn-secondary' },
    { href: '/imports', label: 'Import', color: 'btn-secondary' },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of study participant activity</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={link.color}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards counts={counts} />

      {/* Active Participants Section */}
      <div className="card-body p-0">
        <div className="flex items-center justify-between px-4 md:px-5 pt-4 md:pt-5 pb-3">
          <h2 className="section-title flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Active Participants
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {participants.length} total
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-slate-500">
            <svg className="animate-spin h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Loading participants...</span>
          </div>
        </div>
      ) : (
        <ParticipantTable participants={participants} />
      )}
    </main>
  );
}
