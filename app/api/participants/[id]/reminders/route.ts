import { NextRequest, NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';
import { generateReminderJobs, getActiveRulesForStudy } from '@/lib/services/reminderScheduler';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const participant = await supabaseRepositories.getParticipantById(params.id);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    const visits = await supabaseRepositories.listVisitsByParticipantId(params.id);
    if (visits.length === 0) {
      return NextResponse.json({ error: 'No visits scheduled yet' }, { status: 400 });
    }

    // Cancel existing pending/scheduled jobs for this participant
    const existingJobs = await supabaseRepositories.listReminderJobs({
      participantId: params.id,
    });
    let canceledCount = 0;
    for (const job of existingJobs) {
      if (job.status === 'scheduled' || job.status === 'pending_review') {
        await supabaseRepositories.updateReminderJob(job.id, {
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          canceled_reason: 'regenerated',
        });
        canceledCount++;
      }
    }

    // For each (rule_id, visit), check if a sent job already exists
    // with the SAME visit_datetime_snapshot (meaning it was sent for the current schedule, not a previous one)
    const currentSnapshots = new Map<string, string>();
    for (const visit of visits) {
      currentSnapshots.set(visit.id, visit.scheduled_datetime);
    }

    const alreadySentKeys = new Set<string>();
    for (const job of existingJobs) {
      if (job.status === 'sent' && job.rule_id && job.visit_id) {
        const currentSnapshot = currentSnapshots.get(job.visit_id);
        // Only consider it a duplicate if the snapshot matches the current visit datetime
        if (currentSnapshot && job.visit_datetime_snapshot === currentSnapshot) {
          alreadySentKeys.add(`${job.rule_id}:${job.visit_id}`);
        }
      }
    }

    const allRules = await supabaseRepositories.listActiveReminderRules();
    const studyRules = getActiveRulesForStudy(allRules, participant.study_id);

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalDuplicates = 0;

    for (const visit of visits) {
      const relevantRules = studyRules.filter((r) => {
        const phases = getRulePhasesForVisitDay(visit.visit_day);
        return phases.includes(r.phase);
      });

      // Skip rules that already have a sent job matching current schedule
      const newRules = relevantRules.filter((r) => {
        if (alreadySentKeys.has(`${r.rule_id}:${visit.id}`)) {
          totalDuplicates++;
          return false;
        }
        return true;
      });

      if (newRules.length === 0) continue;

      const result = await generateReminderJobs(
        supabaseRepositories,
        participant,
        visits,
        newRules
      );

      totalCreated += result.created.length;
      totalSkipped += result.skipped.length;
    }

    return NextResponse.json({
      canceled: canceledCount,
      created: totalCreated,
      skipped: totalSkipped,
      duplicates_skipped: totalDuplicates,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error instanceof Object
        ? JSON.stringify(error)
        : String(error) || 'Unknown error';
    return NextResponse.json({ error: message, type: typeof error }, { status: 500 });
  }
}

function getRulePhasesForVisitDay(visitDay: number): string[] {
  switch (visitDay) {
    case 0:
      return ['day0', 'week6', 'week18'];
    case 90:
      return ['day90'];
    case 180:
      return ['day180'];
    default:
      return [];
  }
}
