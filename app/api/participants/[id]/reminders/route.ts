import { NextRequest, NextResponse } from 'next/server';
import { supabaseRepositories } from '@/lib/repositories/supabase';
import {
  getActiveRulesForStudy,
  calculateSendDatetime,
} from '@/lib/services/reminderScheduler';
import { splitDateTime } from '@/lib/timezone';

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

    // Collect all existing jobs for this participant
    const existingJobs = await supabaseRepositories.listReminderJobs({
      participantId: params.id,
    });

    // Build a set of (rule_id, visit_id) combinations that already have jobs
    const existingRuleVisit = new Set<string>();
    for (const job of existingJobs) {
      if (job.rule_id && job.visit_id) {
        existingRuleVisit.add(`${job.rule_id}:${job.visit_id}`);
      }
    }

    let createdCount = 0;
    let skipCount = 0;

    for (const visit of visits) {
      const relevantRules = studyRules.filter((r) => {
        const phases = getRulePhasesForVisitDay(visit.visit_day);
        return phases.includes(r.phase);
      });

      for (const rule of relevantRules) {
        const key = `${rule.rule_id}:${visit.id}`;

        if (existingRuleVisit.has(key)) {
          skipCount++;
          continue;
        }

        // No existing job — create new one
        const sendDatetime = calculateSendDatetime(rule, visit, participant.timezone);
        if (!sendDatetime) continue;

        const { date: sendDate, time: sendTime } = splitDateTime(sendDatetime, participant.timezone);
        const now = new Date();
        const jobStatus = sendDatetime < now ? ('pending_review' as const) : ('scheduled' as const);
        const reason = jobStatus === 'pending_review' ? 'Send time is in the past' : null;

        await supabaseRepositories.createReminderJob({
          reminder_id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          participant_id: participant.id,
          study_id: participant.study_id,
          visit_id: visit.id,
          phase: rule.phase,
          rule_id: rule.rule_id,
          email_name: rule.email_name,
          template_id: rule.template_id,
          scheduled_send_date: sendDate,
          scheduled_send_time: sendTime,
          scheduled_send_datetime: sendDatetime.toISOString(),
          visit_date_snapshot: visit.scheduled_date,
          visit_time_snapshot: visit.scheduled_time,
          visit_datetime_snapshot: visit.scheduled_datetime,
          status: jobStatus,
          sent_at: null,
          canceled_at: null,
          canceled_reason: reason,
          provider_message_id: null,
          last_error: null,
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      created: createdCount,
      already_exist: skipCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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
