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

    // Collect all existing jobs for this participant for quick lookup
    const existingJobs = await supabaseRepositories.listReminderJobs({
      participantId: params.id,
    });

    // Build a lookup key -> job map
    const jobByKey = new Map<string, typeof existingJobs[number]>();
    for (const job of existingJobs) {
      if (job.rule_id && job.scheduled_send_datetime && job.visit_datetime_snapshot) {
        const key = `${job.rule_id}:${job.scheduled_send_datetime}:${job.visit_datetime_snapshot}`;
        jobByKey.set(key, job);
      }
    }

    let revivedCount = 0;
    let createdCount = 0;
    let duplicateCount = 0;

    for (const visit of visits) {
      const relevantRules = studyRules.filter((r) => {
        const phases = getRulePhasesForVisitDay(visit.visit_day);
        return phases.includes(r.phase);
      });

      for (const rule of relevantRules) {
        const sendDatetime = calculateSendDatetime(rule, visit, participant.timezone);
        if (!sendDatetime) continue;

        const { date: sendDate, time: sendTime } = splitDateTime(sendDatetime, participant.timezone);
        const visitSnapshot = visit.scheduled_datetime;
        const key = `${rule.rule_id}:${sendDatetime.toISOString()}:${visitSnapshot}`;

        const existing = jobByKey.get(key);

        if (existing) {
          if (existing.status === 'sent') {
            // Already sent for this schedule — skip
            duplicateCount++;
            continue;
          }
          // Revive canceled or update failed
          if (existing.status === 'canceled' || existing.status === 'failed' || existing.status === 'skipped') {
            await supabaseRepositories.updateReminderJob(existing.id, {
              status: 'scheduled',
              canceled_at: null,
              canceled_reason: null,
              last_error: null,
              scheduled_send_datetime: sendDatetime.toISOString(),
              scheduled_send_date: sendDate,
              scheduled_send_time: sendTime,
            });
            revivedCount++;
            continue;
          }
          // Already scheduled/pending_review — keep as is
          if (existing.status === 'scheduled' || existing.status === 'pending_review') {
            duplicateCount++;
            continue;
          }
          continue;
        }

        // No existing job — create new one
        const now = new Date();
        const jobStatus = sendDatetime < now ? ('pending_review' as const) : ('scheduled' as const);
        const reason = jobStatus === 'pending_review' ? 'Send time is in the past' : null;
        const visitObj = visits.find((v) => v.id === visit.id) || visit;

        await supabaseRepositories.createReminderJob({
          reminder_id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          participant_id: participant.id,
          study_id: participant.study_id,
          visit_id: visitObj.id,
          phase: rule.phase,
          rule_id: rule.rule_id,
          email_name: rule.email_name,
          template_id: rule.template_id,
          scheduled_send_date: sendDate,
          scheduled_send_time: sendTime,
          scheduled_send_datetime: sendDatetime.toISOString(),
          visit_date_snapshot: visitObj.scheduled_date,
          visit_time_snapshot: visitObj.scheduled_time,
          visit_datetime_snapshot: visitObj.scheduled_datetime,
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
      revived: revivedCount,
      created: createdCount,
      duplicates_skipped: duplicateCount,
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
