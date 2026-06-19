'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ReminderJob {
  id: string;
  email_name: string;
  phase: string;
  status: string;
  scheduled_send_datetime: string;
  sent_at: string | null;
  participant_id: string;
  study_id?: string;
}

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'badge-scheduled',
  sent: 'badge-sent',
  failed: 'badge-failed',
  canceled: 'badge-canceled',
  skipped: 'badge-completed',
};

const PHASE_LABELS: Record<string, string> = {
  day0: 'Day 0',
  day90: 'Day 90',
  day180: 'Day 180',
  week6: 'Week 6',
  week18: 'Week 18',
};

const LA_TZ = 'America/Los_Angeles';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: LA_TZ,
  });
}

function isOverdue(job: ReminderJob): boolean {
  if (job.status !== 'scheduled') return false;
  return Date.now() - new Date(job.scheduled_send_datetime).getTime() > 12 * 60 * 60 * 1000;
}

export default function RemindersPage() {
  const [jobs, setJobs] = useState<ReminderJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [sortKey, setSortKey] = useState<string>('scheduled_send_datetime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const loadJobs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/reminders?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setJobs(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadJobs();
  }, [statusFilter]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: string }) => {
    if (sortKey !== k) return <span className="ml-1 text-slate-300">&#x2195;</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleFilter = (key: string) => {
    setShowOverdueOnly(false);
    setStatusFilter(key === 'all' ? '' : key);
  };

  const handleSend = async (jobId: string) => {
    const res = await fetch(`/api/reminders/${jobId}/send`, { method: 'POST' });
    const result = await res.json();
    alert(result.success ? 'Sent!' : `Failed: ${result.error}`);
    loadJobs();
  };

  const canSend = (s: string) => ['scheduled', 'failed'].includes(s);

  const filtered = showOverdueOnly ? jobs.filter(isOverdue) : jobs;

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'email_name': cmp = a.email_name.localeCompare(b.email_name); break;
      case 'study_id': cmp = (a.study_id || '').localeCompare(b.study_id || ''); break;
      case 'phase': cmp = (a.phase || '').localeCompare(b.phase || ''); break;
      case 'status': cmp = a.status.localeCompare(b.status); break;
      case 'overdue': cmp = (isOverdue(a) ? 1 : 0) - (isOverdue(b) ? 1 : 0); break;
      case 'scheduled_send_datetime': cmp = new Date(a.scheduled_send_datetime).getTime() - new Date(b.scheduled_send_datetime).getTime(); break;
      case 'sent_at': cmp = (a.sent_at || '').localeCompare(b.sent_at || ''); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const filterBtns = [
    { k: 'all', l: 'All' },
    { k: 'scheduled', l: 'Scheduled' },
    { k: 'overdue', l: 'Overdue' },
    { k: 'sent', l: 'Sent' },
    { k: 'failed', l: 'Failed' },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="page-title">Reminder Emails</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor and manage scheduled reminder email jobs</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/participants" className="btn-primary">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Participants
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {filterBtns.map(({ k, l }) => (
          <button
            key={k}
            onClick={() => k === 'overdue' ? (setShowOverdueOnly(true), setStatusFilter('')) : handleFilter(k)}
            className={
              (k === 'overdue' ? showOverdueOnly : statusFilter === k)
                ? 'filter-btn-active' : 'filter-btn-inactive'
            }
          >
            {l}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto tabular-nums">{jobs.length} total jobs</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-slate-500">
            <svg className="animate-spin h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Loading reminders...</span>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('email_name')}>
                    Email <SortIcon k="email_name" />
                  </th>
                  <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('study_id')}>
                    Participant <SortIcon k="study_id" />
                  </th>
                  <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('phase')}>
                    Phase <SortIcon k="phase" />
                  </th>
                  <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('status')}>
                    Status <SortIcon k="status" />
                  </th>
                  <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('overdue')}>
                    Overdue <SortIcon k="overdue" />
                  </th>
                  <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('scheduled_send_datetime')}>
                    Scheduled <SortIcon k="scheduled_send_datetime" />
                  </th>
                  <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('sent_at')}>
                    Sent <SortIcon k="sent_at" />
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((job) => {
                  const overdue = isOverdue(job);
                  return (
                  <tr key={job.id} className={overdue ? 'bg-rose-50/60' : ''}>
                    <td className="max-w-[250px] truncate font-medium text-slate-900" title={job.email_name}>
                      {job.email_name}
                    </td>
                    <td className="text-slate-600">
                      {job.study_id || '—'}
                    </td>
                    <td>
                      <span className="badge-completed">
                        {PHASE_LABELS[job.phase] || job.phase}
                      </span>
                    </td>
                    <td>
                      <span className={STATUS_BADGE[job.status] || 'badge-completed'}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {overdue ? (
                        <span className="badge-overdue">overdue</span>
                      ) : (
                        <span className="text-xs text-slate-300">&mdash;</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-slate-600">{formatDateTime(job.scheduled_send_datetime)}</td>
                    <td className="whitespace-nowrap text-slate-600">{formatDateTime(job.sent_at)}</td>
                    <td>
                      {canSend(job.status) && (
                        <button
                          onClick={() => handleSend(job.id)}
                          className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium"
                        >
                          Send Now
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-sm text-slate-500 py-8">No reminder jobs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
