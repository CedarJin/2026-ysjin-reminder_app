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
  pending_review: 'bg-yellow-100 text-yellow-800',
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
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReminderJobsPanel({ jobs, participantId, onRefresh }: ReminderJobsPanelProps) {
  const [sending, setSending] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

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
    if (!confirm('Generate reminder jobs for all existing visits?')) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/participants/${participantId}/reminders`, { method: 'POST' });
      const result = await res.json();
      if (!res.ok) {
        alert(`Failed: ${result.error || 'Unknown error'}`);
      } else {
        alert(`Created ${result.created} reminder jobs (${result.skipped} skipped)`);
      }
      onRefresh?.();
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRegenerating(false);
    }
  };

  const canSend = (status: string) =>
    status === 'scheduled' || status === 'pending_review' || status === 'failed';

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

  const sorted = [...jobs].sort(
    (a, b) => new Date(b.scheduled_send_datetime).getTime() - new Date(a.scheduled_send_datetime).getTime()
  );

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
              <th className="pb-2 pr-3">Email</th>
              <th className="pb-2 pr-3">Phase</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2 pr-3">Scheduled Send</th>
              <th className="pb-2 pr-3">Sent At</th>
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
