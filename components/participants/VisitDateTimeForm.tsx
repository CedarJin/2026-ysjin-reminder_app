'use client';

import { useState } from 'react';

interface VisitDateTimeFormProps {
  visitDay: 0 | 90 | 180;
  visitName: string;
  onSubmit: (data: {
    visitDay: 0 | 90 | 180;
    scheduledDate: string;
    scheduledTime: string;
  }) => void;
}

const VISIT_ICONS: Record<string, string> = {
  'Day 0': 'bg-teal-100 text-teal-700',
  'Day 90': 'bg-indigo-100 text-indigo-700',
  'Day 180': 'bg-emerald-100 text-emerald-700',
};

export default function VisitDateTimeForm({
  visitDay,
  visitName,
  onSubmit,
}: VisitDateTimeFormProps) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ visitDay, scheduledDate, scheduledTime });
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${VISIT_ICONS[visitName] || 'bg-slate-100 text-slate-600'}`}>
            {visitDay === 0 ? 'B' : visitDay}
          </span>
          <h4 className="font-semibold text-slate-800">Schedule {visitName}</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="input-field"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="btn-primary mt-3 w-full"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Schedule
        </button>
      </div>
    </form>
  );
}
