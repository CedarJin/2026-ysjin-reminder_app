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
    {
      key: 'active',
      label: 'Active Participants',
      value: counts.totalActive,
      accent: 'border-l-4 border-emerald-500',
      icon: (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    {
      key: 'emailsToday',
      label: 'Emails Today',
      value: counts.emailsToday,
      accent: 'border-l-4 border-teal-500',
      icon: (
        <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      key: 'upcomingVisits',
      label: 'Upcoming Visits This Week',
      value: counts.upcomingVisitsThisWeek,
      accent: 'border-l-4 border-blue-500',
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      key: 'missingDay90',
      label: 'Missing Day 90',
      value: counts.missingDay90,
      accent: 'border-l-4 border-amber-500',
      icon: (
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      key: 'missingDay180',
      label: 'Missing Day 180',
      value: counts.missingDay180,
      accent: 'border-l-4 border-amber-500',
      icon: (
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      key: 'failedEmails',
      label: 'Failed Emails',
      value: counts.failedEmails,
      accent: 'border-l-4 border-rose-500',
      icon: (
        <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      key: 'recentReschedules',
      label: 'Recent Reschedules',
      value: counts.recentReschedules,
      accent: 'border-l-4 border-indigo-500',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
      ),
    },
    {
      key: 'needsAttention',
      label: 'Needs Attention',
      value: counts.needsAttention,
      accent: 'border-l-4 border-orange-500',
      icon: (
        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.097.572 2.625 1.438M12 12.75c-1.148 0-2.097.572-2.625 1.438M12 12.75V8.25m6.364 2.614a9 9 0 00-9.728 0M6.75 15.75l-1.5 1.5m13.5 0l-1.5-1.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
      {cards.map((card) => (
        <button
          key={card.key}
          onClick={() => onFilterChange?.(card.key)}
          className={`stat-card text-left w-full ${card.accent}`}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{card.label}</p>
            <span className="shrink-0">{card.icon}</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums">{card.value}</p>
        </button>
      ))}
    </div>
  );
}
