'use client';

import { Visit, CalculatedStudyEvent, ReminderJob } from '@/lib/db/schema';

interface ParticipantTimelineProps {
  visits: Visit[];
  events: CalculatedStudyEvent[];
  jobs: ReminderJob[];
}

const STATUS_BADGE: Record<string, string> = {
  sent: 'badge-sent',
  scheduled: 'badge-scheduled',
  canceled: 'badge-canceled',
  failed: 'badge-failed',
};

const VISIT_STATUS_COLORS: Record<string, string> = {
  scheduled: 'text-blue-700 bg-blue-50',
  rescheduled: 'text-orange-700 bg-orange-50',
  canceled: 'text-red-700 bg-red-50',
  completed: 'text-emerald-700 bg-emerald-50',
};

export default function ParticipantTimeline({
  visits,
  events,
  jobs,
}: ParticipantTimelineProps) {
  const phases = [
    { label: 'Day 0', day: 0, phaseKey: 'day0', desc: 'Baseline visit' },
    { label: 'Week 6', phaseKey: 'week6', eventKey: 'week6_habitual_diet_start', desc: 'Habitual diet assessment' },
    { label: 'Day 90', day: 90, phaseKey: 'day90', desc: 'Follow-up visit' },
    { label: 'Week 18', phaseKey: 'week18', eventKey: 'week18_habitual_diet_start', desc: 'Habitual diet assessment' },
    { label: 'Day 180', day: 180, phaseKey: 'day180', desc: 'Final visit' },
  ];

  const phaseIcons: Record<string, string> = {
    'Day 0': '01',
    'Week 6': '02',
    'Day 90': '03',
    'Week 18': '04',
    'Day 180': '05',
  };

  const phaseDots: Record<string, string> = {
    'Day 0': 'border-teal-400 bg-teal-100',
    'Week 6': 'border-blue-400 bg-blue-100',
    'Day 90': 'border-indigo-400 bg-indigo-100',
    'Week 18': 'border-violet-400 bg-violet-100',
    'Day 180': 'border-emerald-400 bg-emerald-100',
  };

  return (
    <div className="space-y-0">
      {phases.map((phase, idx) => {
        const visit = phase.day !== undefined ? visits.find((v) => v.visit_day === phase.day) : null;
        const event = phase.eventKey
          ? events.find((e) => e.event_key === phase.eventKey)
          : null;
        const phaseJobs = jobs
          .filter((j) => j.phase === phase.phaseKey)
          .sort((a, b) => {
            const aPending = a.status === 'scheduled' ? 0 : 1;
            const bPending = b.status === 'scheduled' ? 0 : 1;
            if (aPending !== bPending) return aPending - bPending;
            return new Date(a.scheduled_send_datetime).getTime() - new Date(b.scheduled_send_datetime).getTime();
          });

        return (
          <div key={phase.label} className="relative pl-8 pb-6 last:pb-0">
            {/* Timeline connector */}
            {idx < phases.length - 1 && (
              <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200" />
            )}

            {/* Phase dot */}
            <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${phaseDots[phase.label] || 'border-slate-300 bg-slate-100 text-slate-600'}`}>
              {phaseIcons[phase.label]}
            </div>

            {/* Phase card */}
            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{phase.label}</h3>
                    <p className="text-xs text-slate-500">{phase.desc}</p>
                  </div>
                </div>

                {visit ? (
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span className="text-sm text-slate-600">
                      {visit.scheduled_date}
                      {visit.scheduled_time ? ` at ${visit.scheduled_time}` : ''}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${VISIT_STATUS_COLORS[visit.status] || 'text-slate-600 bg-slate-100'}`}>
                      {visit.status}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mb-3 italic">No visit scheduled.</p>
                )}

                {event && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span><span className="font-medium text-slate-700">{event.event_name}:</span> {event.event_date}{event.event_time ? ` at ${event.event_time}` : ''}</span>
                  </div>
                )}

                {phaseJobs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Reminder Emails</p>
                    <div className="space-y-1.5">
                      {phaseJobs.map((job) => {
                        const isOldSchedule =
                          visit &&
                          visit.status === 'rescheduled' &&
                          job.visit_datetime_snapshot &&
                          job.visit_datetime_snapshot !== visit.scheduled_datetime;

                        return (
                          <div key={job.id} className="flex items-center gap-2 text-sm">
                            <span className={isOldSchedule ? 'text-slate-400 line-through' : 'text-slate-700'}>
                              {job.email_name}
                            </span>
                            {isOldSchedule && (
                              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">old schedule</span>
                            )}
                            {isOldSchedule && job.status === 'sent' ? (
                              <span className="badge-canceled">superseded</span>
                            ) : (
                              <span className={STATUS_BADGE[job.status] || 'badge-completed'}>
                                {job.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
