import {
  Participant,
  Visit,
  CalculatedStudyEvent,
  ReminderRule,
  ReminderJob,
  EmailTemplate,
  AuditLog,
} from '../db/schema';

export interface ParticipantFilters {
  studyId?: string;
  status?: Participant['status'];
  search?: string;
}

export interface ReminderJobFilters {
  participantId?: string;
  status?: ReminderJob['status'];
  dueBefore?: Date;
  phase?: string;
}

export interface Repositories {
  // Participants
  createParticipant(data: Omit<Participant, 'id' | 'created_at' | 'updated_at'>): Promise<Participant>;
  getParticipantById(id: string): Promise<Participant | null>;
  getParticipantByKey(participantKey: string): Promise<Participant | null>;
  updateParticipant(id: string, data: Partial<Participant>): Promise<Participant>;
  listParticipants(filters?: ParticipantFilters): Promise<Participant[]>;

  // Visits
  createVisit(data: Omit<Visit, 'id' | 'created_at' | 'updated_at'>): Promise<Visit>;
  getVisitById(id: string): Promise<Visit | null>;
  getVisitByParticipantAndDay(participantId: string, visitDay: number): Promise<Visit | null>;
  updateVisit(id: string, data: Partial<Visit>): Promise<Visit>;
  listVisitsByParticipantId(participantId: string): Promise<Visit[]>;

  // Calculated study events
  upsertCalculatedEvent(
    data: Omit<CalculatedStudyEvent, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CalculatedStudyEvent>;
  listCalculatedEventsByParticipantId(participantId: string): Promise<CalculatedStudyEvent[]>;
  deleteCalculatedEventsByParticipantId(participantId: string): Promise<void>;

  // Reminder rules
  createReminderRule(data: Omit<ReminderRule, 'id' | 'created_at' | 'updated_at'>): Promise<ReminderRule>;
  listActiveReminderRules(): Promise<ReminderRule[]>;

  // Reminder jobs
  createReminderJob(data: Omit<ReminderJob, 'id' | 'created_at' | 'updated_at'>): Promise<ReminderJob>;
  getReminderJobById(id: string): Promise<ReminderJob | null>;
  listReminderJobs(filters?: ReminderJobFilters): Promise<ReminderJob[]>;
  updateReminderJob(id: string, data: Partial<ReminderJob>): Promise<ReminderJob>;
  cancelReminderJobs(
    participantId: string,
    visitId: string | null,
    visitDatetimeSnapshot: Date | null,
    reason: string
  ): Promise<number>;
  findEquivalentReminderJob(
    participantId: string,
    ruleId: string,
    scheduledSendDatetime: Date | string,
    visitDatetimeSnapshot: Date | string | null
  ): Promise<ReminderJob | null>;

  // Email templates
  getEmailTemplateByTemplateId(templateId: string): Promise<EmailTemplate | null>;
  listEmailTemplates(): Promise<EmailTemplate[]>;

  // Audit logs
  createAuditLog(data: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog>;
}
