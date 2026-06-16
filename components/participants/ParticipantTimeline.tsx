'use client';

import { Visit, CalculatedStudyEvent, ReminderJob } from '@/lib/db/schema';

interface ParticipantTimelineProps {
  visits: Visit[];
  events: CalculatedStudyEvent[];
  jobs: ReminderJob[];
}

export default function ParticipantTimeline({
  visits,
  events,
  jobs,
}: ParticipantTimelineProps) {
  const phases = [
    { label: 'Day 0', day: 0 },
    { label: 'Week 6', eventKey: 'week6_habitual_diet_start' },
    { label: 'Day 90', day: 90 },
    { label: 'Week 18', eventKey: 'week18_habitual_diet_start' },
    { label: 'Day 180', day: 180 },
  ];

  return (
    <div className="space-y-6">
      {phases.map((phase) => {
        const visit = phase.day !== undefined ? visits.find((v) => v.visit_day === phase.day) : null;
        const event = phase.eventKey
          ? events.find((e) => e.event_key === phase.eventKey)
          : null;
        const phaseJobs = phase.day !== undefined
          ? jobs.filter((j) => j.visit_id === visit?.id)
          : event
          ? jobs.filter((j) => j.rule_id.includes(phase.eventKey!.replace('_habitual_diet_start', '')))
          : [];

        return (
          <div key={phase.label} className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">{phase.label}</h3>
            {visit ? (
              <div className="mb-2">
                <p className="text-sm text-gray-600">
                  Visit: {visit.scheduled_date} at {visit.scheduled_time}
                </p>
                <p className="text-sm">
                  Status:{" "}
                  <span
                    className={`font-medium ${
                      visit.status === 'scheduled'
                        ? 'text-blue-600'
                        : visit.status === 'canceled'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {visit.status}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-2">No visit scheduled.</p>
            )}

            {event && (
              <p className="text-sm text-gray-600 mb-2">
                {event.event_name}: {event.event_date}
                {event.event_time && ` at ${event.event_time}`}
              </p>
            )}

            {phaseJobs.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Emails</p>
                <ul className="text-sm space-y-1">
                  {phaseJobs.map((job) => (
                    <li key={job.id} className="flex justify-between">
                      <span>{job.email_name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          job.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : job.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
