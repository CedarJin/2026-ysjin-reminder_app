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
        </div>
      </div>

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
