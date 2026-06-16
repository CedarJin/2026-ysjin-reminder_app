import { describe, it, expect } from 'vitest';
import { getCurrentPhase } from '../../lib/currentPhase';

describe('currentPhase', () => {
  it('returns Needs Day 0 schedule when Day 0 is missing', () => {
    expect(getCurrentPhase({ day0Date: null, day90Date: null, day180Date: null })).toBe(
      'Needs Day 0 schedule'
    );
  });

  it('returns Pre-Day 0 when today is before Day 0', () => {
    expect(
      getCurrentPhase(
        { day0Date: '2026-08-12', day90Date: null, day180Date: null },
        new Date('2026-08-10T00:00:00.000Z')
      )
    ).toBe('Pre-Day 0');
  });

  it('returns Post-Day 0 between Day 0 and Week 6', () => {
    expect(
      getCurrentPhase(
        { day0Date: '2026-08-12', day90Date: null, day180Date: null },
        new Date('2026-08-20T00:00:00.000Z')
      )
    ).toBe('Post-Day 0');
  });

  it('returns Week 6 during Week 6', () => {
    expect(
      getCurrentPhase(
        { day0Date: '2026-08-12', day90Date: null, day180Date: null },
        new Date('2026-09-22T00:00:00.000Z')
      )
    ).toBe('Week 6');
  });

  it('returns Needs Day 90 schedule after Week 6', () => {
    expect(
      getCurrentPhase(
        { day0Date: '2026-08-12', day90Date: null, day180Date: null },
        new Date('2026-10-01T00:00:00.000Z')
      )
    ).toBe('Needs Day 90 schedule');
  });

  it('returns Pre-Day 90 before Day 90', () => {
    expect(
      getCurrentPhase(
        { day0Date: '2026-08-12', day90Date: '2026-11-10', day180Date: null },
        new Date('2026-10-15T00:00:00.000Z')
      )
    ).toBe('Pre-Day 90');
  });

  it('returns Week 18 during Week 18', () => {
    expect(
      getCurrentPhase(
        { day0Date: '2026-08-12', day90Date: '2026-11-10', day180Date: null },
        new Date('2026-12-15T00:00:00.000Z')
      )
    ).toBe('Week 18');
  });

  it('returns Needs Day 180 schedule after Week 18', () => {
    expect(
      getCurrentPhase(
        { day0Date: '2026-08-12', day90Date: '2026-11-10', day180Date: null },
        new Date('2026-12-25T00:00:00.000Z')
      )
    ).toBe('Needs Day 180 schedule');
  });

  it('returns Pre-Day 180 before Day 180', () => {
    expect(
      getCurrentPhase(
        { day0Date: '2026-08-12', day90Date: '2026-11-10', day180Date: '2026-12-18' },
        new Date('2026-12-16T00:00:00.000Z')
      )
    ).toBe('Pre-Day 180');
  });

  it('returns Post-Day 180 after Day 180', () => {
    expect(
      getCurrentPhase(
        { day0Date: '2026-08-12', day90Date: '2026-11-10', day180Date: '2026-12-18' },
        new Date('2026-12-20T00:00:00.000Z')
      )
    ).toBe('Post-Day 180 / Completed pending review');
  });
});
