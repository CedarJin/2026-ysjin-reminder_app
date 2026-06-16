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
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-4">
      <h4 className="font-medium mb-3">Schedule {visitName}</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Time</label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Schedule
      </button>
    </form>
  );
}
