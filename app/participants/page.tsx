'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Participant } from '@/lib/db/schema';

type StatusFilter = '' | 'active' | 'paused' | 'withdrawn' | 'completed';
type SortKey = 'status' | 'study_id' | 'last_name';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  withdrawn: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-800',
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
    if (sortKey !== k) return <span className="ml-1 text-gray-300">↕</span>;
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
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Participants</h1>
        <div className="space-x-4">
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            {showForm ? 'Cancel' : 'Add Participant'}
          </button>
          <Link href="/dashboard"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">New Participant</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Study ID *</label>
              <input type="text" required value={formData.studyId}
                onChange={(e) => setFormData({ ...formData, studyId: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Timezone</label>
              <input type="text" value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name *</label>
              <input type="text" required value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name *</label>
              <input type="text" required value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input type="email" required value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <button type="submit" disabled={submitting}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Participant'}
          </button>
        </form>
      )}

      {/* Status filter buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map((s) => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)}
            className={`px-3 py-1 text-sm rounded-md ${
              statusFilter === s.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('study_id')}>
                  Study ID <SortIcon k="study_id" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('status')}>
                  Status <SortIcon k="status" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</div>
                    <div className="text-sm text-gray-500">{p.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.study_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-800'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={`/participants/${p.id}`} className="text-blue-600 hover:text-blue-900">View</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">No participants found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
