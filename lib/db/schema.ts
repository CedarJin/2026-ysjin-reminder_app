export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      participants: {
        Row: Participant;
        Insert: ParticipantInsert;
        Update: Partial<Participant>;
        Relationships: [];
      };
      visits: {
        Row: Visit;
        Insert: VisitInsert;
        Update: Partial<Visit>;
        Relationships: [
          {
            foreignKeyName: 'visits_participant_id_fkey';
            columns: ['participant_id'];
            isOneToOne: false;
            referencedRelation: 'participants';
            referencedColumns: ['id'];
          }
        ];
      };
      calculated_study_events: {
        Row: CalculatedStudyEvent;
        Insert: CalculatedStudyEventInsert;
        Update: Partial<CalculatedStudyEvent>;
        Relationships: [
          {
            foreignKeyName: 'calculated_study_events_participant_id_fkey';
            columns: ['participant_id'];
            isOneToOne: false;
            referencedRelation: 'participants';
            referencedColumns: ['id'];
          }
        ];
      };
      reminder_rules: {
        Row: ReminderRule;
        Insert: ReminderRuleInsert;
        Update: Partial<ReminderRule>;
        Relationships: [];
      };
      reminder_jobs: {
        Row: ReminderJob;
        Insert: ReminderJobInsert;
        Update: Partial<ReminderJob>;
        Relationships: [
          {
            foreignKeyName: 'reminder_jobs_participant_id_fkey';
            columns: ['participant_id'];
            isOneToOne: false;
            referencedRelation: 'participants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminder_jobs_visit_id_fkey';
            columns: ['visit_id'];
            isOneToOne: false;
            referencedRelation: 'visits';
            referencedColumns: ['id'];
          }
        ];
      };
      email_templates: {
        Row: EmailTemplate;
        Insert: EmailTemplateInsert;
        Update: Partial<EmailTemplate>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLogInsert;
        Update: Partial<AuditLog>;
        Relationships: [
          {
            foreignKeyName: 'audit_logs_participant_id_fkey';
            columns: ['participant_id'];
            isOneToOne: false;
            referencedRelation: 'participants';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, {
      Row: Record<string, unknown>;
      Insert: Record<string, unknown>;
      Update: Record<string, unknown>;
      Relationships: never[];
    }>;
    Functions: Record<string, {
      Args: Record<string, unknown>;
      Returns: unknown;
    }>;
    Enums: Record<string, never>;
  };
};

export interface Participant {
  id: string;
  participant_key: string;
  participant_id: string | null;
  study_id: string;
  first_name: string;
  last_name: string;
  email: string;
  timezone: string;
  status: 'active' | 'paused' | 'withdrawn' | 'completed';
  email_opt_out: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ParticipantInsert = Omit<Participant, 'id' | 'created_at' | 'updated_at'>;

export interface Visit {
  id: string;
  participant_id: string;
  study_id: string;
  visit_day: 0 | 90 | 180;
  visit_name: string;
  scheduled_date: string;
  scheduled_time: string;
  scheduled_datetime: string;
  timezone: string;
  status: 'missing' | 'scheduled' | 'rescheduled' | 'completed' | 'canceled';
  created_at: string;
  updated_at: string;
}

export type VisitInsert = Omit<Visit, 'id' | 'created_at' | 'updated_at'>;

export interface CalculatedStudyEvent {
  id: string;
  participant_id: string;
  study_id: string;
  source_visit_day: 0 | 90 | 180;
  event_key: string;
  event_name: string;
  event_date: string | null;
  event_time: string | null;
  event_datetime: string | null;
  timezone: string;
  calculation_rule: string;
  created_at: string;
  updated_at: string;
}

export type CalculatedStudyEventInsert = Omit<CalculatedStudyEvent, 'id' | 'created_at' | 'updated_at'>;

export interface ReminderRule {
  id: string;
  rule_id: string;
  email_name: string;
  study_id: string | null;
  phase: string;
  based_on_date: string;
  based_on_time: string | null;
  trigger_type: 'send_when_new_visit_scheduled' | 'relative_to_visit_date' | 'monday_of_week_after_day0';
  offset_amount: number | null;
  offset_unit: string | null;
  week_number: number | null;
  fixed_send_time: string | null;
  template_id: string;
  reschedule_template_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ReminderRuleInsert = Omit<ReminderRule, 'id' | 'created_at' | 'updated_at'>;

export interface ReminderJob {
  id: string;
  reminder_id: string;
  participant_id: string;
  study_id: string;
  visit_id: string | null;
  phase: string;
  rule_id: string;
  email_name: string;
  template_id: string;
  scheduled_send_date: string;
  scheduled_send_time: string;
  scheduled_send_datetime: string;
  visit_date_snapshot: string | null;
  visit_time_snapshot: string | null;
  visit_datetime_snapshot: string | null;
  status: 'scheduled' | 'pending_review' | 'sent' | 'failed' | 'canceled' | 'skipped';
  sent_at: string | null;
  canceled_at: string | null;
  canceled_reason: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export type ReminderJobInsert = Omit<ReminderJob, 'id' | 'created_at' | 'updated_at'>;

export interface EmailTemplate {
  id: string;
  template_id: string;
  study_id: string | null;
  email_name: string;
  subject: string;
  body: string;
  active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export type EmailTemplateInsert = Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>;

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  participant_id: string | null;
  before_json: Json | null;
  after_json: Json | null;
  created_at: string;
}

export type AuditLogInsert = Omit<AuditLog, 'id' | 'created_at'>;

export type ParticipantRow = Database['public']['Tables']['participants']['Row'];
export type VisitRow = Database['public']['Tables']['visits']['Row'];
export type CalculatedStudyEventRow = Database['public']['Tables']['calculated_study_events']['Row'];
export type ReminderRuleRow = Database['public']['Tables']['reminder_rules']['Row'];
export type ReminderJobRow = Database['public']['Tables']['reminder_jobs']['Row'];
export type EmailTemplateRow = Database['public']['Tables']['email_templates']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
