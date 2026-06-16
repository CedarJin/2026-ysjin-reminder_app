import { describe, it, expect } from 'vitest';
import {
  combineDateAndTime,
  splitDateTime,
  getMondayOfWeek,
  addDays,
  addWeeks,
  subtractHours,
  formatDate,
  formatTime,
  validateDateFormat,
  validateTimeFormat,
} from '../../lib/timezone';

describe('timezone', () => {
  describe('combineDateAndTime', () => {
    it('combines date and time in America/Los_Angeles', () => {
      const result = combineDateAndTime('2026-08-12', '09:00', 'America/Los_Angeles');
      // 2026-08-12 09:00 PDT = 2026-08-12 16:00 UTC
      expect(result.toISOString()).toBe('2026-08-12T16:00:00.000Z');
    });

    it('combines date and time in America/New_York', () => {
      const result = combineDateAndTime('2026-08-12', '09:00', 'America/New_York');
      // 2026-08-12 09:00 EDT = 2026-08-12 13:00 UTC
      expect(result.toISOString()).toBe('2026-08-12T13:00:00.000Z');
    });

    it('throws on invalid date format', () => {
      expect(() => combineDateAndTime('08/12/2026', '09:00', 'America/Los_Angeles')).toThrow(
        'Invalid date format'
      );
    });

    it('throws on invalid time format', () => {
      expect(() => combineDateAndTime('2026-08-12', '9:00 AM', 'America/Los_Angeles')).toThrow(
        'Invalid time format'
      );
    });
  });

  describe('splitDateTime', () => {
    it('splits UTC datetime into date and time for a timezone', () => {
      const result = splitDateTime(new Date('2026-08-12T16:00:00.000Z'), 'America/Los_Angeles');
      expect(result.date).toBe('2026-08-12');
      expect(result.time).toBe('09:00');
    });
  });

  describe('getMondayOfWeek', () => {
    it('returns Monday of the week for a Wednesday', () => {
      const wednesday = new Date('2026-08-12T16:00:00.000Z'); // Wednesday
      const monday = getMondayOfWeek(wednesday, 'America/Los_Angeles');
      expect(monday.toISOString()).toBe('2026-08-10T07:00:00.000Z'); // Monday 00:00 PDT
    });
  });

  describe('date arithmetic', () => {
    it('adds days', () => {
      const result = addDays(new Date('2026-08-12T00:00:00.000Z'), -3);
      expect(result.toISOString()).toBe('2026-08-09T00:00:00.000Z');
    });

    it('adds weeks', () => {
      const result = addWeeks(new Date('2026-08-12T00:00:00.000Z'), 6);
      expect(result.toISOString()).toBe('2026-09-23T00:00:00.000Z');
    });

    it('subtracts hours', () => {
      const result = subtractHours(new Date('2026-08-12T16:00:00.000Z'), 12);
      expect(result.toISOString()).toBe('2026-08-12T04:00:00.000Z');
    });
  });

  describe('formatting', () => {
    it('formats date', () => {
      expect(formatDate(new Date('2026-08-12T16:00:00.000Z'), 'America/Los_Angeles')).toBe(
        'August 12, 2026'
      );
    });

    it('formats time', () => {
      expect(formatTime(new Date('2026-08-12T16:00:00.000Z'), 'America/Los_Angeles')).toBe(
        '9:00 AM'
      );
    });
  });

  describe('validation', () => {
    it('validates date format', () => {
      expect(validateDateFormat('2026-08-12')).toBe(true);
      expect(validateDateFormat('08/12/2026')).toBe(false);
    });

    it('validates time format', () => {
      expect(validateTimeFormat('09:00')).toBe(true);
      expect(validateTimeFormat('9:00 AM')).toBe(false);
    });
  });
});
