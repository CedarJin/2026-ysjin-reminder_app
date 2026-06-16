import { NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Direct Supabase client for raw queries (avoids N+1 loop)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as never } }
);

export async function GET() {
  try {
    const now = new Date();

    // All participants
    const allParticipants = await supabaseRepositories.listParticipants();
    const activeParticipants = allParticipants.filter((p) => p.status === 'active');
    const activeIds = activeParticipants.map((p) => p.id);

    // Emails sent today — use direct counts instead of loading all jobs
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString();

    const { count: emailsToday } = await supabase
      .from('reminder_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', todayStr);

    const { count: failedEmails } = await supabase
      .from('reminder_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    const failedEmailCount = failedEmails ?? 0;

    // Upcoming visits this week
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    // Get all visits for active participants
    const { data: allVisits, error: visitsError } = await supabase
      .from('visits')
      .select('*')
      .in('participant_id', activeIds.length > 0 ? activeIds : ['__none__']);

    if (visitsError) throw visitsError;

    const visits = (allVisits || []) as Array<{
      id: string;
      participant_id: string;
      visit_day: number;
      status: string;
      scheduled_date: string;
      updated_at: string;
    }>;

    // Count upcoming visits (unique participants with visits this week)
    const participantsWithUpcoming = new Set(
      visits
        .filter((v) => {
          if (v.status !== 'scheduled' && v.status !== 'rescheduled') return false;
          const d = new Date(v.scheduled_date + 'T00:00:00');
          return d >= now && d <= endOfWeek;
        })
        .map((v) => v.participant_id)
    );

    // Missing day 90/180 (participants with day0 but not day90/day180)
    const participantsWithDay0 = new Set(
      visits.filter((v) => v.visit_day === 0 && v.status !== 'canceled').map((v) => v.participant_id)
    );
    const participantsWithDay90 = new Set(
      visits.filter((v) => v.visit_day === 90 && v.status !== 'canceled').map((v) => v.participant_id)
    );
    const participantsWithDay180 = new Set(
      visits.filter((v) => v.visit_day === 180 && v.status !== 'canceled').map((v) => v.participant_id)
    );

    const missingDay90 = [...participantsWithDay0].filter((id) => !participantsWithDay90.has(id)).length;
    const missingDay180 = [...participantsWithDay0].filter((id) => !participantsWithDay180.has(id)).length;

    // Recent reschedules (within last 7 days) - DIRECT database check
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const rescheduledVisits = visits.filter(
      (v) => v.status === 'rescheduled' && v.updated_at && new Date(v.updated_at) >= sevenDaysAgo
    );
    const recentReschedules = rescheduledVisits.length;

    const needsAttention = missingDay90 + missingDay180 + (failedEmailCount > 0 ? 1 : 0);

    return NextResponse.json({
      totalActive: activeParticipants.length,
      emailsToday,
      upcomingVisitsThisWeek: participantsWithUpcoming.size,
      missingDay90,
      missingDay180,
      failedEmails: failedEmailCount,
      recentReschedules,
      needsAttention,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('/api/dashboard/stats error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
