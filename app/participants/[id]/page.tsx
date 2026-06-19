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

const STATUS_SELECT_STYLES: Record<string, string> = {
  active: 'border-emerald-300 text-emerald-700 bg-emerald-50',
  paused: 'border-amber-300 text-amber-700 bg-amber-50',
  withdrawn: 'border-rose-300 text-rose-700 bg-rose-50',
  completed: 'border-slate-300 text-slate-600 bg-slate-50',
};

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
      const existingVisit = data?.visits.find((v) => v.visit_day === formData.visitDay);

      let res: Response;
      if (existingVisit) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-2 text-slate-500">
          <svg className="animate-spin h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Loading participant details...</span>
        </div>
      </div>
    );
  }
  if (!data) return <p>Participant not found.</p>;

  const { participant, visits, events, jobs } = data;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="mb-4">
        <Link href="/participants" className="text-sm text-slate-500 hover:text-teal-600 transition-colors inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Participants
        </Link>
      </nav>

      {/* Participant Header Card */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-teal-700">
                  {participant.first_name?.[0]}{participant.last_name?.[0]}
                </span>
              </div>
              <div>
                <h1 className="page-title">
                  {participant.first_name} {participant.last_name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    {participant.email}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {participant.study_id}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {participant.timezone}
                  </span>
                </div>
              </div>
            </div>

            {/* Status + Edit */}
            <div className="flex items-center gap-3 shrink-0">
              <label className="text-sm text-slate-500 font-medium">Status:</label>
              <select
                value={participant.status}
                onChange={(e) => handleStatusChange(e.target.value as Participant['status'])}
                disabled={savingStatus}
                className={`text-sm border-2 rounded-lg px-3 py-1.5 font-medium transition-colors ${STATUS_SELECT_STYLES[participant.status] || 'border-slate-300 text-slate-700 bg-slate-50'}`}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="completed">Completed</option>
              </select>
              {savingStatus && <span className="text-xs text-slate-400 animate-pulse">saving...</span>}
              <button onClick={() => { setShowEdit(!showEdit); if (!showEdit) setEditForm({ first_name: participant.first_name, last_name: participant.last_name, email: participant.email, timezone: participant.timezone }); }}
                className={showEdit ? 'btn-secondary' : 'btn-ghost border border-slate-200'}>
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                {showEdit ? 'Cancel' : 'Edit Info'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {showEdit && (
        <div className="card mb-6">
          <div className="card-body">
            <h2 className="section-title mb-4">Edit Participant Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <input type="text" value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input type="text" value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                <input type="text" value={editForm.timezone}
                  onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                  className="input-field" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
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
                className="btn-primary">
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setShowEdit(false)}
                className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: Visit Forms + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left: Visit Schedule Forms */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <h2 className="section-title">Schedule Visits</h2>
          </div>
          {[0, 90, 180].map((day) => (
            <VisitDateTimeForm
              key={day}
              visitDay={day as 0 | 90 | 180}
              visitName={`Day ${day}`}
              onSubmit={handleScheduleVisit}
            />
          ))}
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="section-title">Study Timeline</h2>
          </div>
          <ParticipantTimeline visits={visits} events={events} jobs={jobs} />
        </div>
      </div>

      {/* Reminder Jobs Panel */}
      <div className="mt-2">
        <ReminderJobsPanel jobs={jobs} participantId={participantId} participantTimezone={participant.timezone} onRefresh={refreshData} />
      </div>
    </main>
  );
}
