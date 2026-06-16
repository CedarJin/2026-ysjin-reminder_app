'use client';

interface SummaryCardsProps {
  counts: {
    totalActive: number;
    emailsToday: number;
    upcomingVisitsThisWeek: number;
    missingDay90: number;
    missingDay180: number;
    failedEmails: number;
    recentReschedules: number;
    needsAttention: number;
  };
  onFilterChange?: (filter: string) => void;
}

export default function SummaryCards({ counts, onFilterChange }: SummaryCardsProps) {
  const cards = [
    { key: 'active', label: 'Active Participants', value: counts.totalActive, color: 'bg-blue-100' },
    { key: 'emailsToday', label: 'Emails Today', value: counts.emailsToday, color: 'bg-green-100' },
    { key: 'upcomingVisits', label: 'Upcoming Visits This Week', value: counts.upcomingVisitsThisWeek, color: 'bg-purple-100' },
    { key: 'missingDay90', label: 'Missing Day 90', value: counts.missingDay90, color: 'bg-yellow-100' },
    { key: 'missingDay180', label: 'Missing Day 180', value: counts.missingDay180, color: 'bg-yellow-100' },
    { key: 'failedEmails', label: 'Failed Emails', value: counts.failedEmails, color: 'bg-red-100' },
    { key: 'recentReschedules', label: 'Recent Reschedules', value: counts.recentReschedules, color: 'bg-indigo-100' },
    { key: 'needsAttention', label: 'Needs Attention', value: counts.needsAttention, color: 'bg-orange-100' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <button
          key={card.key}
          onClick={() => onFilterChange?.(card.key)}
          className={`${card.color} p-4 rounded-lg shadow-sm text-left hover:shadow-md transition-shadow`}
        >
          <p className="text-sm text-gray-600">{card.label}</p>
          <p className="text-2xl font-bold text-gray-900">{card.value}</p>
        </button>
      ))}
    </div>
  );
}
