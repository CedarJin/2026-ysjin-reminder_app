'use client';

import { useState } from 'react';
import { ReminderJob } from '@/lib/db/schema';
import { fromZonedTime } from 'date-fns-tz';

interface ReminderJobsPanelProps {
  jobs: ReminderJob[];
  participantId: string;
  participantTimezone: string;
  onRefresh?: () => void;
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

type SortKey = 'email_name' | 'phase' | 'status' | 'scheduled_send_datetime' | 'sent_at' | 'overdue';
type SortDir = 'asc' | 'desc';

const LA_TZ = 'America/Los_Angeles';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: LA_TZ,
  });
}

function formatDateInput(d: string): string {
  return d ? d.slice(0, 10) : '';
}

function isOverdue(job: ReminderJob): boolean {
  if (job.status !== 'scheduled') return false;
  const diff = Date.now() - new Date(job.scheduled_send_datetime).getTime();
  return diff > 12 * 60 * 60 * 1000;
}

function getStatusRank(status: string): number {
  if (status === 'scheduled') return 0;
  return 1;
}

export default function ReminderJobsPanel({ jobs, participantId, participantTimezone, onRefresh }: ReminderJobsPanelProps) {
  const [sending, setSending] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('scheduled_send_datetime');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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
      if (!result.success) alert(`Send failed: ${result.error || 'Unknown error'}`);
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
      if (!res.ok) alert(`Failed: ${result.error || 'Unknown error'}`);
      else alert(`Created ${result.created} new, ${result.already_exist} already exist (skipped)`);
      onRefresh?.();
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRegenerating(false);
    }
  };

  const startEdit = (job: ReminderJob) => {
    setEditingId(job.id);
    setEditDate(job.scheduled_send_date || formatDateInput(job.scheduled_send_datetime));
    setEditTime(job.scheduled_send_time?.slice(0, 5) || '09:00');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (jobId: string) => {
    setSavingEdit(true);
    try {
      // Convert from participant's timezone to UTC for storage
      const utcDate = fromZonedTime(`${editDate}T${editTime}:00`, participantTimezone);
      const newDatetime = utcDate.toISOString();

      const res = await fetch(`/api/reminders/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_send_date: editDate,
          scheduled_send_time: editTime,
          scheduled_send_datetime: newDatetime,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Save failed: ${err.error || 'Unknown error'}`);
      }
      onRefresh?.();
      setEditingId(null);
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!confirm('Cancel this reminder email?')) return;
    try {
      const res = await fetch(`/api/reminders/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'canceled', canceled_at: new Date().toISOString(), canceled_reason: 'manual' }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Cancel failed: ${err.error || 'Unknown error'}`);
      }
      onRefresh?.();
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const sorted = [...jobs].sort((a, b) => {
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
      case 'overdue':
        cmp = (isOverdue(a) ? 0 : 1) - (isOverdue(b) ? 0 : 1);
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
    if (sortKey !== column) return <span className="ml-1 text-slate-300">&#x2195;</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (jobs.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <h2 className="section-title">Reminder Emails</h2>
            </div>
            <button onClick={handleRegenerate} disabled={regenerating}
              className="btn-primary text-xs">
              {regenerating ? 'Generating...' : 'Regenerate'}
            </button>
          </div>
          <p className="text-sm text-slate-500">No reminder jobs yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-body border-b border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <h2 className="section-title">Reminder Emails</h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">{jobs.length} jobs</span>
          </div>
          <button onClick={handleRegenerate} disabled={regenerating}
            className="btn-secondary text-xs">
            {regenerating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('email_name')}>
                Email <SortIcon column="email_name" />
              </th>
              <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('phase')}>
                Phase <SortIcon column="phase" />
              </th>
              <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('status')}>
                Status <SortIcon column="status" />
              </th>
              <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('overdue')}>
                Overdue <SortIcon column="overdue" />
              </th>
              <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('scheduled_send_datetime')}>
                Scheduled Send <SortIcon column="scheduled_send_datetime" />
              </th>
              <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('sent_at')}>
                Sent At <SortIcon column="sent_at" />
              </th>
              <th>Template</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((job) => {
              const overdue = isOverdue(job);
              const isEditing = editingId === job.id;

              if (isEditing) {
                return (
                  <tr key={job.id} className="bg-amber-50/60">
                    <td className="max-w-[180px] truncate font-medium text-slate-900" title={job.email_name}>
                      {job.email_name}
                    </td>
                    <td>
                      <span className="badge-completed">
                        {PHASE_LABELS[job.phase] || job.phase}
                      </span>
                    </td>
                    <td><span className="text-sm text-slate-600">{job.status}</span></td>
                    <td><span className="text-sm text-slate-300">&mdash;</span></td>
                    <td colSpan={2}>
                      <div className="flex items-center gap-1.5">
                        <input type="date" value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="input-field text-xs py-1 px-2 w-32" />
                        <input type="time" value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="input-field text-xs py-1 px-2 w-24" />
                      </div>
                    </td>
                    <td className="text-xs text-slate-500">{job.template_id}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => saveEdit(job.id)} disabled={savingEdit}
                          className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50">
                          {savingEdit ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={cancelEdit}
                          className="px-2 py-1 text-xs bg-white border border-slate-300 text-slate-600 rounded hover:bg-slate-50">
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={job.id} className={`${overdue ? 'bg-rose-50/60' : ''}`}>
                  <td className="max-w-[180px] truncate font-medium text-slate-900" title={job.email_name}>
                    {job.email_name}
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
                  <td className="whitespace-nowrap text-slate-600">
                    {formatDateTime(job.scheduled_send_datetime)}
                  </td>
                  <td className="whitespace-nowrap text-slate-600">
                    {formatDateTime(job.sent_at)}
                  </td>
                  <td className="text-xs text-slate-500 max-w-[100px] truncate" title={job.template_id}>
                    {job.template_id}
                  </td>
                  <td>
                    <div className="flex items-center gap-1 flex-wrap">
                      {job.status === 'scheduled' && (
                        <>
                          <button onClick={() => handleSendNow(job.id)} disabled={sending === job.id}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
                            {sending === job.id ? '...' : 'Send Now'}
                          </button>
                          <button onClick={() => handleCancel(job.id)}
                            className="px-2 py-1 text-xs bg-rose-500 text-white rounded hover:bg-rose-600">
                            Cancel
                          </button>
                        </>
                      )}
                      {job.status === 'failed' && (
                        <button onClick={() => handleSendNow(job.id)} disabled={sending === job.id}
                          className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
                          {sending === job.id ? '...' : 'Send Now'}
                        </button>
                      )}
                      <button onClick={() => startEdit(job)}
                        className="px-2 py-1 text-xs bg-white border border-slate-300 text-slate-600 rounded hover:bg-slate-50">
                        Edit
                      </button>
                    </div>
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
  );
}
