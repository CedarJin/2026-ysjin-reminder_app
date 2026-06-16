import { describe, it, expect } from 'vitest';
import {
  calculateDay0Events,
  calculateDay90Events,
  calculateDay180Events,
  calculateWeek6,
  calculateWeek18,
  buildCalculatedEvents,
} from '../../lib/services/calculatedEvents';

describe('calculatedEvents', () => {
  describe('calculateDay0Events', () => {
    it('calculates Day 0 derived events', () => {
      const events = calculateDay0Events('2026-08-12', '09:00', 'America/Los_Angeles');

      // Patternized diet starts 3 days before: 2026-08-09
      expect(events.patternizedDietStartDate.toISOString()).toBe('2026-08-09T00:00:00.000Z');

      // Stool sample window: 24 hours before Day 0 visit
      // Day 0 visit is 2026-08-12 16:00 UTC
      expect(events.stoolSampleWindowStart.toISOString()).toBe('2026-08-11T16:00:00.000Z');
      expect(events.stoolSampleWindowEnd.toISOString()).toBe('2026-08-12T16:00:00.000Z');

      // Last bite: 12 hours before Day 0 visit
      expect(events.lastBiteDatetime.toISOString()).toBe('2026-08-12T04:00:00.000Z');
    });
  });

  describe('calculateDay90Events', () => {
    it('calculates Day 90 derived events', () => {
      const events = calculateDay90Events('2026-11-10', '13:00', 'America/Los_Angeles');

      // Patternized diet starts 3 days before: 2026-11-07
      expect(events.patternizedDietStartDate.toISOString()).toBe('2026-11-07T00:00:00.000Z');

      // Day 90 visit is 2026-11-10 21:00 UTC (13:00 PST)
      expect(events.stoolSampleWindowStart.toISOString()).toBe('2026-11-09T21:00:00.000Z');
      expect(events.stoolSampleWindowEnd.toISOString()).toBe('2026-11-10T21:00:00.000Z');

      // Last bite: 12 hours before
      expect(events.lastBiteDatetime.toISOString()).toBe('2026-11-10T09:00:00.000Z');
    });
  });

  describe('calculateDay180Events', () => {
    it('calculates Day 180 last bite', () => {
      const events = calculateDay180Events('2026-11-21', '09:00', 'America/Los_Angeles');
      // 2026-11-21 09:00 PST = 17:00 UTC; minus 12 hours = 05:00 UTC
      expect(events.lastBiteDatetime.toISOString()).toBe('2026-11-21T05:00:00.000Z');
    });
  });

  describe('calculateWeek6', () => {
    it('returns Monday of Week 6 at 09:00', () => {
      const result = calculateWeek6('2026-08-12', 'America/Los_Angeles');
      // Week 6 target = 2026-09-23. Monday of that week = 2026-09-21.
      // 09:00 PDT = 16:00 UTC
      expect(result.sendDatetime.toISOString()).toBe('2026-09-21T16:00:00.000Z');
    });
  });

  describe('calculateWeek18', () => {
    it('returns Monday of Week 18 at 09:00', () => {
      const result = calculateWeek18('2026-08-12', null, null, 'America/Los_Angeles');
      // Week 18 target = 2026-12-16. Monday of that week = 2026-12-14.
      expect(result.sendDatetime.toISOString()).toBe('2026-12-14T17:00:00.000Z');
      expect(result.warnings).toHaveLength(0);
    });

    it('warns when Week 18 is not after Day 90', () => {
      const result = calculateWeek18('2026-08-12', '2026-12-15', null, 'America/Los_Angeles');
      expect(result.warnings).toContain('Week 18 reminder is not after Day 90');
    });

    it('warns when Week 18 is not before Day 180', () => {
      const result = calculateWeek18('2026-08-12', null, '2026-12-14', 'America/Los_Angeles');
      expect(result.warnings).toContain('Week 18 reminder is not before Day 180');
    });
  });

  describe('buildCalculatedEvents', () => {
    it('builds events for Day 0 only', () => {
      const { events, warnings } = buildCalculatedEvents(
        'STUDY-1',
        '2026-08-12',
        '09:00',
        null,
        null,
        null,
        null,
        'America/Los_Angeles'
      );

      const keys = events.map((e) => e.event_key);
      expect(keys).toContain('day0_patternized_diet_start');
      expect(keys).toContain('day0_stool_sample_window_start');
      expect(keys).toContain('day0_stool_sample_window_end');
      expect(keys).toContain('day0_last_bite');
      expect(keys).toContain('week6_habitual_diet_start');
      expect(keys).toContain('week18_habitual_diet_start');
      expect(keys).not.toContain('day90_patternized_diet_start');
      expect(keys).not.toContain('day180_last_bite');
      expect(warnings).toHaveLength(0);
    });

    it('builds events for all visits', () => {
      const { events } = buildCalculatedEvents(
        'STUDY-1',
        '2026-08-12',
        '09:00',
        '2026-11-10',
        '13:00',
        '2026-12-18',
        '09:00',
        'America/Los_Angeles'
      );

      const keys = events.map((e) => e.event_key);
      expect(keys).toContain('day0_patternized_diet_start');
      expect(keys).toContain('day90_patternized_diet_start');
      expect(keys).toContain('day180_last_bite');
      expect(keys).toContain('week6_habitual_diet_start');
      expect(keys).toContain('week18_habitual_diet_start');
    });
  });
});
