import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import {
  Participant,
  Visit,
  CalculatedStudyEvent,
  ReminderRule,
  ReminderJob,
  EmailTemplate,
  AuditLog,
  Database,
} from '../db/schema';
import { Repositories, ParticipantFilters, ReminderJobFilters } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables for service role client');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  realtime: { transport: ws as never },
});

function toISODate(date: Date | string): string {
  return typeof date === 'string' ? date : date.toISOString();
}

export const supabaseRepositories: Repositories = {
  // Participants
  async createParticipant(data) {
    const { data: result, error } = await supabase
      .from('participants')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result as Participant;
  },

  async getParticipantById(id) {
    const { data, error } = await supabase.from('participants').select('*').eq('id', id).single();
    if (error) return null;
    return data as Participant;
  },

  async getParticipantByKey(participantKey) {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('participant_key', participantKey)
      .single();
    if (error) return null;
    return data as Participant;
  },

  async updateParticipant(id, data) {
    const { data: result, error } = await supabase
      .from('participants')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result as Participant;
  },

  async listParticipants(filters = {}) {
    let query = supabase.from('participants').select('*');

    if (filters.studyId) {
      query = query.eq('study_id', filters.studyId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Participant[]) || [];
  },

  // Visits
  async createVisit(data) {
    const { data: result, error } = await supabase
      .from('visits')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result as Visit;
  },

  async getVisitById(id) {
    const { data, error } = await supabase.from('visits').select('*').eq('id', id).single();
    if (error) return null;
    return data as Visit;
  },

  async getVisitByParticipantAndDay(participantId, visitDay) {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('participant_id', participantId)
      .eq('visit_day', visitDay)
      .single();
    if (error) return null;
    return data as Visit;
  },

  async updateVisit(id, data) {
    const { data: result, error } = await supabase
      .from('visits')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result as Visit;
  },

  async listVisitsByParticipantId(participantId) {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('participant_id', participantId)
      .order('visit_day', { ascending: true });
    if (error) throw error;
    return (data as Visit[]) || [];
  },

  // Calculated study events
  async upsertCalculatedEvent(data) {
    const { data: result, error } = await supabase
      .from('calculated_study_events')
      .upsert(
        {
          ...data,
          event_datetime: data.event_datetime ? toISODate(data.event_datetime) : null,
        },
        { onConflict: 'participant_id,event_key' }
      )
      .select()
      .single();
    if (error) throw error;
    return result as CalculatedStudyEvent;
  },

  async listCalculatedEventsByParticipantId(participantId) {
    const { data, error } = await supabase
      .from('calculated_study_events')
      .select('*')
      .eq('participant_id', participantId)
      .order('event_key', { ascending: true });
    if (error) throw error;
    return (data as CalculatedStudyEvent[]) || [];
  },

  async deleteCalculatedEventsByParticipantId(participantId) {
    const { error } = await supabase
      .from('calculated_study_events')
      .delete()
      .eq('participant_id', participantId);
    if (error) throw error;
  },

  // Reminder rules
  async createReminderRule(data) {
    const { data: result, error } = await supabase
      .from('reminder_rules')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result as ReminderRule;
  },

  async listActiveReminderRules() {
    const { data, error } = await supabase
      .from('reminder_rules')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as ReminderRule[]) || [];
  },

  // Reminder jobs
  async createReminderJob(data) {
    const { data: result, error } = await supabase
      .from('reminder_jobs')
      .insert({
        ...data,
        scheduled_send_datetime: toISODate(data.scheduled_send_datetime),
        visit_datetime_snapshot: data.visit_datetime_snapshot
          ? toISODate(data.visit_datetime_snapshot)
          : null,
      })
      .select()
      .single();
    if (error) throw error;
    return result as ReminderJob;
  },

  async getReminderJobById(id) {
    const { data, error } = await supabase
      .from('reminder_jobs')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as ReminderJob;
  },

  async listReminderJobs(filters = {}) {
    let query = supabase.from('reminder_jobs').select('*');

    if (filters.participantId) {
      query = query.eq('participant_id', filters.participantId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.dueBefore) {
      query = query.lte('scheduled_send_datetime', toISODate(filters.dueBefore));
    }
    if (filters.phase) {
      query = query.eq('phase', filters.phase);
    }

    const { data, error } = await query.order('scheduled_send_datetime', { ascending: true });
    if (error) throw error;
    return (data as ReminderJob[]) || [];
  },

  async updateReminderJob(id, data) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.scheduled_send_datetime) {
      updateData.scheduled_send_datetime = toISODate(data.scheduled_send_datetime);
    }
    if (data.visit_datetime_snapshot) {
      updateData.visit_datetime_snapshot = toISODate(data.visit_datetime_snapshot);
    }
    if (data.sent_at) {
      updateData.sent_at = toISODate(data.sent_at);
    }
    if (data.canceled_at) {
      updateData.canceled_at = toISODate(data.canceled_at);
    }

    const { data: result, error } = await supabase
      .from('reminder_jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result as ReminderJob;
  },

  async cancelReminderJobs(participantId, visitId, visitDatetimeSnapshot, reason) {
    let query = supabase
      .from('reminder_jobs')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        canceled_reason: reason,
      })
      .eq('participant_id', participantId)
      .eq('status', 'scheduled');

    if (visitId) {
      query = query.eq('visit_id', visitId);
    }
    if (visitDatetimeSnapshot) {
      query = query.eq('visit_datetime_snapshot', toISODate(visitDatetimeSnapshot));
    }

    const { data, error } = await query.select();
    if (error) throw error;
    return (data as ReminderJob[] | null)?.length || 0;
  },

  async findEquivalentReminderJob(participantId, ruleId, scheduledSendDatetime, visitDatetimeSnapshot) {
    let query = supabase
      .from('reminder_jobs')
      .select('*')
      .eq('participant_id', participantId)
      .eq('rule_id', ruleId)
      .eq('scheduled_send_datetime', toISODate(scheduledSendDatetime))
      .neq('status', 'canceled');

    if (visitDatetimeSnapshot) {
      query = query.eq('visit_datetime_snapshot', toISODate(visitDatetimeSnapshot));
    } else {
      query = query.is('visit_datetime_snapshot', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) return null;
    return (data as ReminderJob) || null;
  },

  // Email templates
  async getEmailTemplateByTemplateId(templateId) {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_id', templateId)
      .eq('active', true)
      .single();
    if (error) return null;
    return data as EmailTemplate;
  },

  async listEmailTemplates() {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('email_name', { ascending: true });
    if (error) throw error;
    return (data as EmailTemplate[]) || [];
  },

  // Audit logs
  async createAuditLog(data) {
    const { data: result, error } = await supabase
      .from('audit_logs')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result as AuditLog;
  },
};
