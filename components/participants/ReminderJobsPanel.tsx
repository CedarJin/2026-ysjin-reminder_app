'use client';

import { useState } from 'react';
import { ReminderJob } from '@/lib/db/schema';

interface ReminderJobsPanelProps {
  jobs: ReminderJob[];
  participantId: string;
  onRefresh?: () => void;
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

type SortKey = 'email_name' | 'phase' | 'status' | 'scheduled_send_datetime' | 'sent_at';
type SortDir = 'asc' | 'desc';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getStatusRank(status: string): number {
  // Unsent first
  if (status === 'scheduled' ) return 0;
  return 1;
}

export default function ReminderJobsPanel({ jobs, participantId, onRefresh }: ReminderJobsPanelProps) {
  const [sending, setSending] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('scheduled_send_datetime');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleSendNow = async (jobId: string) => {
    setSending(jobId);
    try {
      const res = await fetch(`/api/reminders/${jobId}/send`, { method: 'POST' });
      const result = await res.json();
      if (!result.success) {
        alert(`Send failed: ${result.error || 'Unknown error'}`);
      }
      onRefresh?.();
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSending(null);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('This will replace all pending reminder jobs with fresh ones. Continue?')) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/participants/${participantId}/reminders`, { method: 'POST' });
      const result = await res.json();
      if (!res.ok) {
        alert(`Failed: ${result.error || 'Unknown error'}`);
      } else {
        alert(`Created ${result.created} new, ${result.already_exist} already exist (skipped)`);
      }
      onRefresh?.();
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRegenerating(false);
    }
  };

  const canSend = (status: string) =>
    status === 'scheduled'  || status === 'failed';

  const sorted = [...jobs].sort((a, b) => {
    // Default: unsent first, then by send time ascending
    const rankA = getStatusRank(a.status);
    const rankB = getStatusRank(b.status);
    if (rankA !== rankB) return rankA - rankB;

    let cmp = 0;
    switch (sortKey) {
      case 'email_name':
        cmp = a.email_name.localeCompare(b.email_name);
        break;
      case 'phase':
        cmp = (a.phase || '').localeCompare(b.phase || '');
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status);
        break;
      case 'scheduled_send_datetime':
        cmp = new Date(a.scheduled_send_datetime).getTime() - new Date(b.scheduled_send_datetime).getTime();
        break;
      case 'sent_at':
        cmp = (a.sent_at || '').localeCompare(b.sent_at || '');
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (jobs.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Reminder Emails</h2>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {regenerating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
        <p className="text-sm text-gray-500">No reminder jobs yet. Schedule a visit to generate reminders.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Reminder Emails</h2>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {regenerating ? 'Generating...' : 'Regenerate'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 uppercase">
              <th className="pb-2 pr-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('email_name')}>
                Email <SortIcon column="email_name" />
              </th>
              <th className="pb-2 pr-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('phase')}>
                Phase <SortIcon column="phase" />
              </th>
              <th className="pb-2 pr-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('status')}>
                Status <SortIcon column="status" />
              </th>
              <th className="pb-2 pr-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('scheduled_send_datetime')}>
                Scheduled Send <SortIcon column="scheduled_send_datetime" />
              </th>
              <th className="pb-2 pr-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort('sent_at')}>
                Sent At <SortIcon column="sent_at" />
              </th>
              <th className="pb-2 pr-3">Template</th>
              <th className="pb-2 pr-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((job) => (
              <tr key={job.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2 pr-3 max-w-[200px] truncate" title={job.email_name}>
                  {job.email_name}
                </td>
                <td className="py-2 pr-3">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                    {PHASE_LABELS[job.phase] || job.phase}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {job.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {formatDateTime(job.scheduled_send_datetime)}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {formatDateTime(job.sent_at)}
                </td>
                <td className="py-2 pr-3 text-xs text-gray-500 max-w-[100px] truncate" title={job.template_id}>
                  {job.template_id}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {canSend(job.status) && (
                    <button
                      onClick={() => handleSendNow(job.id)}
                      disabled={sending === job.id}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {sending === job.id ? 'Sending...' : 'Send Now'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
