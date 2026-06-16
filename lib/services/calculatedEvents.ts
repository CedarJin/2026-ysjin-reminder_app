import {
  combineDateAndTime,
  addDays,
  addWeeks,
  subtractHours,
  getMondayOfWeek,
  splitDateTime,
  DEFAULT_TIMEZONE,
} from '../timezone';

export interface CalculatedEvent {
  event_key: string;
  event_name: string;
  source_visit_day: 0 | 90 | 180;
  event_date: string | null;
  event_time: string | null;
  event_datetime: Date | null;
  calculation_rule: string;
}

export interface Day0Events {
  patternizedDietStartDate: Date;
  stoolSampleWindowStart: Date;
  stoolSampleWindowEnd: Date;
  lastBiteDatetime: Date;
}

export interface Day90Events {
  patternizedDietStartDate: Date;
  stoolSampleWindowStart: Date;
  stoolSampleWindowEnd: Date;
  lastBiteDatetime: Date;
}

export interface Day180Events {
  lastBiteDatetime: Date;
}

export interface Week6Event {
  sendDatetime: Date;
}

export interface Week18Event {
  sendDatetime: Date;
  warnings: string[];
}

export function calculateDay0Events(
  day0Date: string,
  day0Time: string,
  timezone: string = DEFAULT_TIMEZONE
): Day0Events {
  const day0Datetime = combineDateAndTime(day0Date, day0Time, timezone);

  return {
    patternizedDietStartDate: addDays(new Date(day0Date + 'T00:00:00Z'), -3),
    stoolSampleWindowStart: addDays(day0Datetime, -1),
    stoolSampleWindowEnd: day0Datetime,
    lastBiteDatetime: subtractHours(day0Datetime, 12),
  };
}

export function calculateDay90Events(
  day90Date: string,
  day90Time: string,
  timezone: string = DEFAULT_TIMEZONE
): Day90Events {
  const day90Datetime = combineDateAndTime(day90Date, day90Time, timezone);

  return {
    patternizedDietStartDate: addDays(new Date(day90Date + 'T00:00:00Z'), -3),
    stoolSampleWindowStart: addDays(day90Datetime, -1),
    stoolSampleWindowEnd: day90Datetime,
    lastBiteDatetime: subtractHours(day90Datetime, 12),
  };
}

export function calculateDay180Events(
  day180Date: string,
  day180Time: string,
  timezone: string = DEFAULT_TIMEZONE
): Day180Events {
  const day180Datetime = combineDateAndTime(day180Date, day180Time, timezone);

  return {
    lastBiteDatetime: subtractHours(day180Datetime, 12),
  };
}

export function calculateWeek6(
  day0Date: string,
  timezone: string = DEFAULT_TIMEZONE
): Week6Event {
  const day0 = new Date(day0Date + 'T00:00:00Z');
  const targetDate = addWeeks(day0, 6);
  const sendDate = getMondayOfWeek(targetDate, timezone);
  const sendDatetime = combineDateAndTime(
    splitDateTime(sendDate, timezone).date,
    '09:00',
    timezone
  );

  return { sendDatetime };
}

export function calculateWeek18(
  day0Date: string,
  day90Date: string | null | undefined,
  day180Date: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): Week18Event {
  const day0 = new Date(day0Date + 'T00:00:00Z');
  const targetDate = addWeeks(day0, 18);
  const sendDate = getMondayOfWeek(targetDate, timezone);
  const sendDatetime = combineDateAndTime(
    splitDateTime(sendDate, timezone).date,
    '09:00',
    timezone
  );

  const warnings: string[] = [];

  if (day90Date) {
    const day90 = new Date(day90Date + 'T00:00:00Z');
    if (sendDate <= day90) {
      warnings.push('Week 18 reminder is not after Day 90');
    }
  }

  if (day180Date) {
    const day180 = new Date(day180Date + 'T00:00:00Z');
    if (sendDate >= day180) {
      warnings.push('Week 18 reminder is not before Day 180');
    }
  }

  return { sendDatetime, warnings };
}

export function buildCalculatedEvents(
  studyId: string,
  day0Date: string | null | undefined,
  day0Time: string | null | undefined,
  day90Date: string | null | undefined,
  day90Time: string | null | undefined,
  day180Date: string | null | undefined,
  day180Time: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): { events: CalculatedEvent[]; warnings: string[] } {
  const events: CalculatedEvent[] = [];
  const warnings: string[] = [];

  if (day0Date && day0Time) {
    const day0Events = calculateDay0Events(day0Date, day0Time, timezone);
    const { date: patternizedDietStartDate } = splitDateTime(
      day0Events.patternizedDietStartDate,
      timezone
    );
    const { date: stoolStartDate, time: stoolStartTime } = splitDateTime(
      day0Events.stoolSampleWindowStart,
      timezone
    );
    const { date: stoolEndDate, time: stoolEndTime } = splitDateTime(
      day0Events.stoolSampleWindowEnd,
      timezone
    );
    const { date: lastBiteDate, time: lastBiteTime } = splitDateTime(
      day0Events.lastBiteDatetime,
      timezone
    );

    events.push(
      {
        event_key: 'day0_patternized_diet_start',
        event_name: 'Day 0 Patternized Diet Start',
        source_visit_day: 0,
        event_date: patternizedDietStartDate,
        event_time: null,
        event_datetime: null,
        calculation_rule: 'scheduled_day_0_date - 3 days',
      },
      {
        event_key: 'day0_stool_sample_window_start',
        event_name: 'Day 0 Stool Sample Window Start',
        source_visit_day: 0,
        event_date: stoolStartDate,
        event_time: stoolStartTime,
        event_datetime: day0Events.stoolSampleWindowStart,
        calculation_rule: 'scheduled_day_0_datetime - 1 day',
      },
      {
        event_key: 'day0_stool_sample_window_end',
        event_name: 'Day 0 Stool Sample Window End',
        source_visit_day: 0,
        event_date: stoolEndDate,
        event_time: stoolEndTime,
        event_datetime: day0Events.stoolSampleWindowEnd,
        calculation_rule: 'scheduled_day_0_datetime',
      },
      {
        event_key: 'day0_last_bite',
        event_name: 'Day 0 Last Bite',
        source_visit_day: 0,
        event_date: lastBiteDate,
        event_time: lastBiteTime,
        event_datetime: day0Events.lastBiteDatetime,
        calculation_rule: 'scheduled_day_0_datetime - 12 hours',
      }
    );

    const week6 = calculateWeek6(day0Date, timezone);
    const { date: week6Date, time: week6Time } = splitDateTime(week6.sendDatetime, timezone);
    events.push({
      event_key: 'week6_habitual_diet_start',
      event_name: 'Week 6 Habitual Diet Start',
      source_visit_day: 0,
      event_date: week6Date,
      event_time: week6Time,
      event_datetime: week6.sendDatetime,
      calculation_rule: 'Monday of Week 6 after Day 0 at 09:00',
    });

    const week18 = calculateWeek18(day0Date, day90Date, day180Date, timezone);
    const { date: week18Date, time: week18Time } = splitDateTime(week18.sendDatetime, timezone);
    events.push({
      event_key: 'week18_habitual_diet_start',
      event_name: 'Week 18 Habitual Diet Start',
      source_visit_day: 0,
      event_date: week18Date,
      event_time: week18Time,
      event_datetime: week18.sendDatetime,
      calculation_rule: 'Monday of Week 18 after Day 0 at 09:00',
    });
    warnings.push(...week18.warnings);
  }

  if (day90Date && day90Time) {
    const day90Events = calculateDay90Events(day90Date, day90Time, timezone);
    const { date: patternizedDietStartDate } = splitDateTime(
      day90Events.patternizedDietStartDate,
      timezone
    );
    const { date: stoolStartDate, time: stoolStartTime } = splitDateTime(
      day90Events.stoolSampleWindowStart,
      timezone
    );
    const { date: stoolEndDate, time: stoolEndTime } = splitDateTime(
      day90Events.stoolSampleWindowEnd,
      timezone
    );
    const { date: lastBiteDate, time: lastBiteTime } = splitDateTime(
      day90Events.lastBiteDatetime,
      timezone
    );

    events.push(
      {
        event_key: 'day90_patternized_diet_start',
        event_name: 'Day 90 Patternized Diet Start',
        source_visit_day: 90,
        event_date: patternizedDietStartDate,
        event_time: null,
        event_datetime: null,
        calculation_rule: 'scheduled_day_90_date - 3 days',
      },
      {
        event_key: 'day90_stool_sample_window_start',
        event_name: 'Day 90 Stool Sample Window Start',
        source_visit_day: 90,
        event_date: stoolStartDate,
        event_time: stoolStartTime,
        event_datetime: day90Events.stoolSampleWindowStart,
        calculation_rule: 'scheduled_day_90_datetime - 1 day',
      },
      {
        event_key: 'day90_stool_sample_window_end',
        event_name: 'Day 90 Stool Sample Window End',
        source_visit_day: 90,
        event_date: stoolEndDate,
        event_time: stoolEndTime,
        event_datetime: day90Events.stoolSampleWindowEnd,
        calculation_rule: 'scheduled_day_90_datetime',
      },
      {
        event_key: 'day90_last_bite',
        event_name: 'Day 90 Last Bite',
        source_visit_day: 90,
        event_date: lastBiteDate,
        event_time: lastBiteTime,
        event_datetime: day90Events.lastBiteDatetime,
        calculation_rule: 'scheduled_day_90_datetime - 12 hours',
      }
    );
  }

  if (day180Date && day180Time) {
    const day180Events = calculateDay180Events(day180Date, day180Time, timezone);
    const { date: lastBiteDate, time: lastBiteTime } = splitDateTime(
      day180Events.lastBiteDatetime,
      timezone
    );

    events.push({
      event_key: 'day180_last_bite',
      event_name: 'Day 180 Last Bite',
      source_visit_day: 180,
      event_date: lastBiteDate,
      event_time: lastBiteTime,
      event_datetime: day180Events.lastBiteDatetime,
      calculation_rule: 'scheduled_day_180_datetime - 12 hours',
    });
  }

  return { events, warnings };
}

export function buildTemplateVariablesFromEvents(events: CalculatedEvent[]): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const event of events) {
    if (event.event_date) {
      const key = `${event.event_key}_date`;
      variables[key] = event.event_date;
    }
    if (event.event_time) {
      const key = `${event.event_key}_time`;
      variables[key] = event.event_time;
    }
  }

  return variables;
}
