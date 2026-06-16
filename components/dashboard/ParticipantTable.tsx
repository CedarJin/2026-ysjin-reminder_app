'use client';

import Link from 'next/link';
import { Participant } from '@/lib/db/schema';

interface ParticipantTableProps {
  participants: Participant[];
}

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-active',
  paused: 'badge-paused',
  withdrawn: 'badge-withdrawn',
  completed: 'badge-completed',
};

export default function ParticipantTable({ participants }: ParticipantTableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Participant</th>
              <th>Study ID</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr key={participant.id}>
                <td>
                  <div className="text-sm font-medium text-slate-900">
                    {participant.first_name} {participant.last_name}
                  </div>
                  <div className="text-sm text-slate-500">{participant.email}</div>
                </td>
                <td className="text-sm text-slate-600 font-mono">
                  {participant.study_id}
                </td>
                <td>
                  <span className={STATUS_BADGE[participant.status] || 'badge-completed'}>
                    {participant.status}
                  </span>
                </td>
                <td>
                  <Link
                    href={`/participants/${participant.id}`}
                    className="btn-ghost text-teal-600 hover:text-teal-700 hover:bg-teal-50 -ml-2"
                  >
                    View Profile
                  </Link>
                </td>
              </tr>
            ))}
            {participants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                  No active participants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
