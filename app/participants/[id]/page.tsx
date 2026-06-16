'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ParticipantTimeline from '@/components/participants/ParticipantTimeline';
import ReminderJobsPanel from '@/components/participants/ReminderJobsPanel';
import VisitDateTimeForm from '@/components/participants/VisitDateTimeForm';
import { Participant, Visit, CalculatedStudyEvent, ReminderJob } from '@/lib/db/schema';

interface ParticipantDetailData {
  participant: Participant;
  visits: Visit[];
  events: CalculatedStudyEvent[];
  jobs: ReminderJob[];
}

export default function ParticipantDetailPage() {
  const params = useParams();
  const participantId = params.id as string;

  const [data, setData] = useState<ParticipantDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', timezone: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const refreshData = () => {
    if (!participantId) return;
    fetch(`/api/participants/${participantId}`)
      .then((res) => res.json())
      .then((data) => setData(data));
  };

  const handleStatusChange = async (newStatus: Participant['status']) => {
    if (!data || newStatus === data.participant.status) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to update status: ${err.error || 'Unknown error'}`);
      }
      refreshData();
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingStatus(false);
    }
  };

  useEffect(() => {
    if (!participantId) return;
    setLoading(true);
    fetch(`/api/participants/${participantId}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, [participantId]);

  const handleScheduleVisit = async (formData: {
    visitDay: 0 | 90 | 180;
    scheduledDate: string;
    scheduledTime: string;
  }) => {
    try {
      // Check if a visit for this day already exists
      const existingVisit = data?.visits.find((v) => v.visit_day === formData.visitDay);

      let res: Response;
      if (existingVisit) {
        // Update existing visit
        res = await fetch(`/api/visits/${existingVisit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledDate: formData.scheduledDate,
            scheduledTime: formData.scheduledTime,
            timezone: data?.participant.timezone,
          }),
        });
      } else {
        // Create new visit
        res = await fetch(`/api/participants/${participantId}/visits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studyId: data?.participant.study_id,
            visitDay: formData.visitDay,
            visitName: `Day ${formData.visitDay}`,
            scheduledDate: formData.scheduledDate,
            scheduledTime: formData.scheduledTime,
            timezone: data?.participant.timezone,
          }),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to schedule: ${err.error || 'Unknown error'}`);
        return;
      }

      refreshData();
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!data) return <p>Participant not found.</p>;

  const { participant, visits, events, jobs } = data;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/participants" className="text-blue-600 hover:underline">← Back to Participants</Link>
          <h1 className="text-2xl font-bold mt-2">
            {participant.first_name} {participant.last_name}
          </h1>
          <p className="text-gray-600">{participant.email} · {participant.study_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Status:</label>
          <select
            value={participant.status}
            onChange={(e) => handleStatusChange(e.target.value as Participant['status'])}
            disabled={savingStatus}
            className={`text-sm border rounded-md px-2 py-1.5 font-medium ${
              participant.status === 'active'
                ? 'border-green-300 text-green-700 bg-green-50'
                : participant.status === 'paused'
                ? 'border-yellow-300 text-yellow-700 bg-yellow-50'
                : participant.status === 'withdrawn'
                ? 'border-red-300 text-red-700 bg-red-50'
                : 'border-gray-300 text-gray-700 bg-gray-50'
            }`}
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="completed">Completed</option>
          </select>
          {savingStatus && <span className="text-xs text-gray-400">saving...</span>}
          <button onClick={() => { setShowEdit(!showEdit); if (!showEdit) setEditForm({ first_name: participant.first_name, last_name: participant.last_name, email: participant.email, timezone: participant.timezone }); }}
            className="ml-4 px-3 py-1.5 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600">
            {showEdit ? 'Cancel' : 'Edit Info'}
          </button>
        </div>
      </div>

      {showEdit && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-3">Edit Participant Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input type="text" value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input type="text" value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Timezone</label>
              <input type="text" value={editForm.timezone}
                onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={async () => {
                setSavingEdit(true);
                try {
                  const res = await fetch(`/api/participants/${participantId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      firstName: editForm.first_name,
                      lastName: editForm.last_name,
                      email: editForm.email,
                      timezone: editForm.timezone,
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    alert(`Save failed: ${err.error || 'Unknown error'}`);
                  } else {
                    setShowEdit(false);
                    refreshData();
                  }
                } catch (err) {
                  alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                } finally {
                  setSavingEdit(false);
                }
              }}
              disabled={savingEdit}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {savingEdit ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowEdit(false)}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold">Schedule Visits</h2>
          {[0, 90, 180].map((day) => (
            <VisitDateTimeForm
              key={day}
              visitDay={day as 0 | 90 | 180}
              visitName={`Day ${day}`}
              onSubmit={handleScheduleVisit}
            />
          ))}
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Study Timeline</h2>
          <ParticipantTimeline visits={visits} events={events} jobs={jobs} />
        </div>
      </div>

      <div className="mt-6">
        <ReminderJobsPanel jobs={jobs} participantId={participantId} onRefresh={refreshData} />
      </div>
    </main>
  );
}
