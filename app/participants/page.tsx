'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Participant } from '@/lib/db/schema';

type StatusFilter = '' | 'active' | 'paused' | 'withdrawn' | 'completed';
type SortKey = 'status' | 'study_id' | 'last_name';

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-active',
  paused: 'badge-paused',
  withdrawn: 'badge-withdrawn',
  completed: 'badge-completed',
};

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [sortKey, setSortKey] = useState<SortKey>('study_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studyId: '',
    firstName: '',
    lastName: '',
    email: '',
    timezone: 'America/Los_Angeles',
  });

  const loadParticipants = () => {
    setLoading(true);
    fetch('/api/participants')
      .then((res) => res.json())
      .then((data) => {
        setParticipants(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const created = await res.json();
        router.push(`/participants/${created.id}`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create participant');
      }
    } catch {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Real participants (not test)
  const realParticipants = useMemo(() => participants.filter((p) => !p.study_id.toLowerCase().startsWith('test')), [participants]);

  // Counts by status (real only)
  const counts = useMemo(() => {
    const c: Record<string, number> = { active: 0, paused: 0, withdrawn: 0, completed: 0 };
    for (const p of realParticipants) {
      if (c[p.status] !== undefined) c[p.status]++;
    }
    return c;
  }, [realParticipants]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = statusFilter ? participants.filter((p) => p.status === statusFilter) : [...participants];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortKey === 'study_id') cmp = a.study_id.localeCompare(b.study_id);
      else cmp = (a.last_name || '').localeCompare(b.last_name || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [participants, statusFilter, sortKey, sortDir]);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="ml-1 text-slate-300">&#x2195;</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const statuses: { key: StatusFilter; label: string }[] = [
    { key: '', label: `All (${participants.length})` },
    { key: 'active', label: `Active (${counts.active})` },
    { key: 'paused', label: `Paused (${counts.paused})` },
    { key: 'withdrawn', label: `Withdrawn (${counts.withdrawn})` },
    { key: 'completed', label: `Completed (${counts.completed})` },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="page-title">Participants</h1>
          <p className="text-sm text-slate-500 mt-1">Manage study participants and their visit schedules</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowForm(!showForm)}
            className={showForm ? 'btn-secondary' : 'btn-primary'}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={showForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4.5v15m7.5-7.5h-15'} />
            </svg>
            {showForm ? 'Cancel' : 'Add Participant'}
          </button>
          <Link href="/dashboard" className="btn-secondary">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card mb-6 md:mb-8">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="section-title">New Participant</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Study ID <span className="text-rose-500">*</span></label>
                  <input type="text" required value={formData.studyId}
                    onChange={(e) => setFormData({ ...formData, studyId: e.target.value })}
                    className="input-field" placeholder="e.g. SUBJ-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                  <input type="text" value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name <span className="text-rose-500">*</span></label>
                  <input type="text" required value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input-field" placeholder="First name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name <span className="text-rose-500">*</span></label>
                  <input type="text" required value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input-field" placeholder="Last name" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-rose-500">*</span></label>
                  <input type="email" required value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field" placeholder="participant@example.com" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button type="submit" disabled={submitting}
                  className="btn-primary">
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </>
                  ) : 'Create Participant'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statuses.map((s) => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)}
            className={statusFilter === s.key ? 'filter-btn-active' : 'filter-btn-inactive'}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
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
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('study_id')}>
                    Study ID <SortIcon k="study_id" />
                  </th>
                  <th className="cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort('status')}>
                    Status <SortIcon k="status" />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="text-sm font-medium text-slate-900">{p.first_name} {p.last_name}</div>
                      <div className="text-sm text-slate-500">{p.email}</div>
                    </td>
                    <td className="text-sm text-slate-600 font-mono">{p.study_id}</td>
                    <td>
                      <span className={STATUS_BADGE[p.status] || 'badge-completed'}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/participants/${p.id}`}
                        className="btn-ghost text-teal-600 hover:text-teal-700 hover:bg-teal-50 -ml-2">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-sm text-slate-500 py-8">No participants found.</td>
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
