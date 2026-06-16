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

    const allRules = await supabaseRepositories.listActiveReminderRules();
    const studyRules = getActiveRulesForStudy(allRules, participant.study_id);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const visit of visits) {
      const relevantRules = studyRules.filter((r) => {
        const phases = getRulePhasesForVisitDay(visit.visit_day);
        return phases.includes(r.phase);
      });

      const result = await generateReminderJobs(
        supabaseRepositories,
        participant,
        visits,
        relevantRules
      );

      totalCreated += result.created.length;
      totalSkipped += result.skipped.length;
    }

    return NextResponse.json({
      created: totalCreated,
      skipped: totalSkipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
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
