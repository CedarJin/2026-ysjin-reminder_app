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

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  canceled: 'bg-gray-200 text-gray-600',
  skipped: 'bg-gray-100 text-gray-500',
};

const PHASE_LABELS: Record<string, string> = {
  day0: 'Day 0',
  day90: 'Day 90',
  day180: 'Day 180',
  week6: 'Week 6',
  week18: 'Week 18',
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
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
    if (sortKey !== k) return <span className="ml-1 text-gray-300">↕</span>;
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

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reminder Emails</h1>
        <div className="space-x-4">
          <Link href="/participants" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Participants
          </Link>
          <Link href="/dashboard" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {[{ k: 'all', l: 'All' }, { k: 'scheduled', l: 'Scheduled' }, { k: 'overdue', l: 'Overdue' }, { k: 'sent', l: 'Sent' }, { k: 'failed', l: 'Failed' }].map(({ k, l }) => (
          <button
            key={k}
            onClick={() => k === 'overdue' ? (setShowOverdueOnly(true), setStatusFilter('')) : handleFilter(k)}
            className={`px-3 py-1 text-sm rounded-md ${
              (k === 'overdue' ? showOverdueOnly : statusFilter === k)
                ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {l}
          </button>
        ))}
        <span className="text-sm text-gray-500 ml-2 self-center">{jobs.length} jobs</span>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 uppercase bg-gray-50">
                <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('email_name')}>Email <SortIcon k="email_name" /></th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('study_id')}>Participant <SortIcon k="study_id" /></th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('phase')}>Phase <SortIcon k="phase" /></th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('status')}>Status <SortIcon k="status" /></th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('overdue')}>Overdue <SortIcon k="overdue" /></th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('scheduled_send_datetime')}>Scheduled <SortIcon k="scheduled_send_datetime" /></th>
                <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('sent_at')}>Sent <SortIcon k="sent_at" /></th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((job) => {
                const overdue = isOverdue(job);
                return (
                <tr key={job.id} className={`border-b last:border-0 hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 max-w-[250px] truncate">{job.email_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {job.study_id || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">
                      {PHASE_LABELS[job.phase] || job.phase}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[job.status] || 'bg-gray-100'}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {overdue ? (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-200 text-red-800">overdue</span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(job.scheduled_send_datetime)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(job.sent_at)}</td>
                  <td className="px-4 py-3">
                    {canSend(job.status) && (
                      <button
                        onClick={() => handleSend(job.id)}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
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
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No reminder jobs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
