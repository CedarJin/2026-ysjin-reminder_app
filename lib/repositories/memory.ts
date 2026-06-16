import {
  Participant,
  Visit,
  CalculatedStudyEvent,
  ReminderRule,
  ReminderJob,
  EmailTemplate,
  AuditLog,
} from '../db/schema';
import { Repositories, ParticipantFilters, ReminderJobFilters } from './types';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function toISOString(date: Date | string): string {
  return typeof date === 'string' ? date : date.toISOString();
}

export function createMemoryRepositories(seedRules: ReminderRule[] = []): Repositories {
  const participants: Participant[] = [];
  const visits: Visit[] = [];
  const calculatedEvents: CalculatedStudyEvent[] = [];
  const reminderRules: ReminderRule[] = [...seedRules];
  const reminderJobs: ReminderJob[] = [];
  const emailTemplates: EmailTemplate[] = [];
  const auditLogs: AuditLog[] = [];

  return {
    // Participants
    async createParticipant(data) {
      const now = new Date().toISOString();
      const participant: Participant = {
        id: generateUUID(),
        ...data,
        created_at: now,
        updated_at: now,
      };
      participants.push(participant);
      return participant;
    },

    async getParticipantById(id) {
      return participants.find((p) => p.id === id) || null;
    },

    async getParticipantByKey(participantKey) {
      return participants.find((p) => p.participant_key === participantKey) || null;
    },

    async updateParticipant(id, data) {
      const index = participants.findIndex((p) => p.id === id);
      if (index === -1) throw new Error(`Participant not found: ${id}`);
      const updated = {
        ...participants[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
      participants[index] = updated;
      return updated;
    },

    async listParticipants(filters = {}) {
      let result = [...participants];
      if (filters.studyId) {
        result = result.filter((p) => p.study_id === filters.studyId);
      }
      if (filters.status) {
        result = result.filter((p) => p.status === filters.status);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.first_name.toLowerCase().includes(search) ||
            p.last_name.toLowerCase().includes(search) ||
            p.email.toLowerCase().includes(search)
        );
      }
      return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    // Visits
    async createVisit(data) {
      const now = new Date().toISOString();
      const visit: Visit = {
        id: generateUUID(),
        ...data,
        created_at: now,
        updated_at: now,
      };
      visits.push(visit);
      return visit;
    },

    async getVisitById(id) {
      return visits.find((v) => v.id === id) || null;
    },

    async getVisitByParticipantAndDay(participantId, visitDay) {
      return visits.find((v) => v.participant_id === participantId && v.visit_day === visitDay) || null;
    },

    async updateVisit(id, data) {
      const index = visits.findIndex((v) => v.id === id);
      if (index === -1) throw new Error(`Visit not found: ${id}`);
      const updated = {
        ...visits[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
      visits[index] = updated;
      return updated;
    },

    async listVisitsByParticipantId(participantId) {
      return visits
        .filter((v) => v.participant_id === participantId)
        .sort((a, b) => a.visit_day - b.visit_day);
    },

    // Calculated study events
    async upsertCalculatedEvent(data) {
      const now = new Date().toISOString();
      const existingIndex = calculatedEvents.findIndex(
        (e) => e.participant_id === data.participant_id && e.event_key === data.event_key
      );

      const event: CalculatedStudyEvent = {
        id: generateUUID(),
        ...data,
        created_at: existingIndex >= 0 ? calculatedEvents[existingIndex].created_at : now,
        updated_at: now,
      };

      if (existingIndex >= 0) {
        calculatedEvents[existingIndex] = event;
      } else {
        calculatedEvents.push(event);
      }

      return event;
    },

    async listCalculatedEventsByParticipantId(participantId) {
      return calculatedEvents
        .filter((e) => e.participant_id === participantId)
        .sort((a, b) => a.event_key.localeCompare(b.event_key));
    },

    async deleteCalculatedEventsByParticipantId(participantId) {
      for (let i = calculatedEvents.length - 1; i >= 0; i--) {
        if (calculatedEvents[i].participant_id === participantId) {
          calculatedEvents.splice(i, 1);
        }
      }
    },

    // Reminder rules
    async createReminderRule(data) {
      const now = new Date().toISOString();
      const rule: ReminderRule = {
        id: generateUUID(),
        ...data,
        created_at: now,
        updated_at: now,
      };
      reminderRules.push(rule);
      return rule;
    },

    async listActiveReminderRules() {
      return reminderRules.filter((r) => r.active).sort((a, b) => a.created_at.localeCompare(b.created_at));
    },

    // Reminder jobs
    async createReminderJob(data) {
      const now = new Date().toISOString();
      const job: ReminderJob = {
        id: generateUUID(),
        ...data,
        scheduled_send_datetime: toISOString(data.scheduled_send_datetime),
        visit_datetime_snapshot: data.visit_datetime_snapshot
          ? toISOString(data.visit_datetime_snapshot)
          : null,
        sent_at: data.sent_at ? toISOString(data.sent_at) : null,
        canceled_at: data.canceled_at ? toISOString(data.canceled_at) : null,
        created_at: now,
        updated_at: now,
      };
      reminderJobs.push(job);
      return job;
    },

    async getReminderJobById(id) {
      return reminderJobs.find((j) => j.id === id) || null;
    },

    async listReminderJobs(filters = {}) {
      let result = [...reminderJobs];
      if (filters.participantId) {
        result = result.filter((j) => j.participant_id === filters.participantId);
      }
      if (filters.status) {
        result = result.filter((j) => j.status === filters.status);
      }
      if (filters.dueBefore) {
        const before = toISOString(filters.dueBefore);
        result = result.filter((j) => j.scheduled_send_datetime <= before);
      }
      if (filters.phase) {
        result = result.filter((j) => j.phase === filters.phase);
      }
      return result.sort((a, b) =>
        a.scheduled_send_datetime.localeCompare(b.scheduled_send_datetime)
      );
    },

    async updateReminderJob(id, data) {
      const index = reminderJobs.findIndex((j) => j.id === id);
      if (index === -1) throw new Error(`Reminder job not found: ${id}`);
      const updated: ReminderJob = {
        ...reminderJobs[index],
        ...data,
        scheduled_send_datetime: data.scheduled_send_datetime
          ? toISOString(data.scheduled_send_datetime)
          : reminderJobs[index].scheduled_send_datetime,
        visit_datetime_snapshot:
          data.visit_datetime_snapshot !== undefined
            ? data.visit_datetime_snapshot
              ? toISOString(data.visit_datetime_snapshot)
              : null
            : reminderJobs[index].visit_datetime_snapshot,
        sent_at:
          data.sent_at !== undefined
            ? data.sent_at
              ? toISOString(data.sent_at)
              : null
            : reminderJobs[index].sent_at,
        canceled_at:
          data.canceled_at !== undefined
            ? data.canceled_at
              ? toISOString(data.canceled_at)
              : null
            : reminderJobs[index].canceled_at,
        updated_at: new Date().toISOString(),
      };
      reminderJobs[index] = updated;
      return updated;
    },

    async cancelReminderJobs(participantId, visitId, visitDatetimeSnapshot, reason) {
      const snapshot = visitDatetimeSnapshot ? toISOString(visitDatetimeSnapshot) : null;
      let count = 0;
      for (const job of reminderJobs) {
        if (
          job.participant_id === participantId &&
          job.status === 'scheduled' &&
          (visitId ? job.visit_id === visitId : true) &&
          (snapshot ? job.visit_datetime_snapshot === snapshot : true)
        ) {
          job.status = 'canceled';
          job.canceled_at = new Date().toISOString();
          job.canceled_reason = reason;
          job.updated_at = new Date().toISOString();
          count++;
        }
      }
      return count;
    },

    async findEquivalentReminderJob(participantId, ruleId, scheduledSendDatetime, visitDatetimeSnapshot) {
      const send = toISOString(scheduledSendDatetime);
      const snapshot = visitDatetimeSnapshot ? toISOString(visitDatetimeSnapshot) : null;
      return (
        reminderJobs.find(
          (j) =>
            j.participant_id === participantId &&
            j.rule_id === ruleId &&
            j.scheduled_send_datetime === send &&
            j.visit_datetime_snapshot === snapshot &&
            j.status !== 'canceled'
        ) || null
      );
    },

    // Email templates
    async getEmailTemplateByTemplateId(templateId) {
      return (
        emailTemplates.find((t) => t.template_id === templateId && t.active) || null
      );
    },

    async listEmailTemplates() {
      return [...emailTemplates];
    },

    // Audit logs
    async createAuditLog(data) {
      const log: AuditLog = {
        id: generateUUID(),
        ...data,
        created_at: new Date().toISOString(),
      };
      auditLogs.push(log);
      return log;
    },
  };
}
