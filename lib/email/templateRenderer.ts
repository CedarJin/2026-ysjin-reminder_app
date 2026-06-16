import { Participant, Visit, CalculatedStudyEvent, ReminderJob } from '../db/schema';
import { splitDateTime, formatDate, formatTime } from '../timezone';

export interface TemplateVariables {
  [key: string]: string;
}

const VARIABLE_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

export function extractVariables(template: string): string[] {
  const matches = template.match(VARIABLE_PATTERN) || [];
  return matches.map((match) => match.slice(2, -2));
}

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(VARIABLE_PATTERN, (match, variableName) => {
    return variables[variableName] !== undefined ? variables[variableName] : match;
  });
}

export function validateVariables(
  template: string,
  variables: TemplateVariables
): { valid: boolean; missing: string[] } {
  const required = extractVariables(template).filter((v, i, a) => a.indexOf(v) === i);
  const missing = required.filter((v) => variables[v] === undefined || variables[v] === '');
  return { valid: missing.length === 0, missing };
}

export function buildVariableMap(
  participant: Participant,
  visits: Visit[],
  events: CalculatedStudyEvent[]
): TemplateVariables {
  const variables: TemplateVariables = {
    first_name: participant.first_name,
    last_name: participant.last_name,
    study_id: participant.study_id,
    email: participant.email,
    timezone: participant.timezone,
  };

  const day0Visit = visits.find((v) => v.visit_day === 0);
  const day90Visit = visits.find((v) => v.visit_day === 90);
  const day180Visit = visits.find((v) => v.visit_day === 180);

  if (day0Visit) {
    variables.day0_visit_date = day0Visit.scheduled_date;
    variables.day0_visit_time = day0Visit.scheduled_time;
  }

  if (day90Visit) {
    variables.day90_visit_date = day90Visit.scheduled_date;
    variables.day90_visit_time = day90Visit.scheduled_time;
  }

  if (day180Visit) {
    variables.day180_visit_date = day180Visit.scheduled_date;
    variables.day180_visit_time = day180Visit.scheduled_time;
  }

  for (const event of events) {
    if (event.event_date) {
      variables[`${event.event_key}_date`] = event.event_date;
    }
    if (event.event_time) {
      variables[`${event.event_key}_time`] = event.event_time;
    }
  }

  return variables;
}

export function buildRescheduleVariableMap(
  participant: Participant,
  oldVisit: Visit,
  newVisit: Visit,
  newEvents: CalculatedStudyEvent[]
): TemplateVariables {
  const variables: TemplateVariables = {
    first_name: participant.first_name,
    last_name: participant.last_name,
    study_id: participant.study_id,
    email: participant.email,
    timezone: participant.timezone,
    old_visit_date: oldVisit.scheduled_date,
    old_visit_time: oldVisit.scheduled_time,
    new_visit_date: newVisit.scheduled_date,
    new_visit_time: newVisit.scheduled_time,
  };

  for (const event of newEvents) {
    if (event.event_key === 'day0_patternized_diet_start' && event.event_date) {
      variables.new_patternized_diet_start_date = event.event_date;
    }
    if (event.event_key === 'day0_stool_sample_window_start' && event.event_date && event.event_time) {
      variables.new_stool_sample_window_start_date = event.event_date;
      variables.new_stool_sample_window_start_time = event.event_time;
    }
    if (event.event_key === 'day0_stool_sample_window_end' && event.event_date && event.event_time) {
      variables.new_stool_sample_window_end_date = event.event_date;
      variables.new_stool_sample_window_end_time = event.event_time;
    }
    if (event.event_key === 'day0_last_bite' && event.event_date && event.event_time) {
      variables.new_last_bite_date = event.event_date;
      variables.new_last_bite_time = event.event_time;
    }
    if (event.event_key === 'day90_patternized_diet_start' && event.event_date) {
      variables.new_patternized_diet_start_date = event.event_date;
    }
    if (event.event_key === 'day90_stool_sample_window_start' && event.event_date && event.event_time) {
      variables.new_stool_sample_window_start_date = event.event_date;
      variables.new_stool_sample_window_start_time = event.event_time;
    }
    if (event.event_key === 'day90_stool_sample_window_end' && event.event_date && event.event_time) {
      variables.new_stool_sample_window_end_date = event.event_date;
      variables.new_stool_sample_window_end_time = event.event_time;
    }
    if (event.event_key === 'day90_last_bite' && event.event_date && event.event_time) {
      variables.new_last_bite_date = event.event_date;
      variables.new_last_bite_time = event.event_time;
    }
  }

  return variables;
}

export function buildVariableMapForJob(
  job: ReminderJob,
  participant: Participant,
  visits: Visit[],
  events: CalculatedStudyEvent[]
): TemplateVariables {
  if (job.rule_id.includes('_reschedule')) {
    // For reschedule emails, we need old and new visit info.
    // The job snapshot stores the new visit. We look up the old visit from audit logs or use current.
    // For simplicity, we use the current visits and build basic reschedule variables.
    const newVisit = visits.find((v) => v.id === job.visit_id);
    if (!newVisit) {
      return buildVariableMap(participant, visits, events);
    }

    const oldVisit: Visit = {
      ...newVisit,
      scheduled_date: job.visit_date_snapshot || newVisit.scheduled_date,
      scheduled_time: job.visit_time_snapshot || newVisit.scheduled_time,
      scheduled_datetime: job.visit_datetime_snapshot || newVisit.scheduled_datetime,
    };

    return buildRescheduleVariableMap(participant, oldVisit, newVisit, events);
  }

  return buildVariableMap(participant, visits, events);
}
