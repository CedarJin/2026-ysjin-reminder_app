import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../../lib/errors';
describe('getErrorMessage', () => {
  it('preserves plain database errors and standard errors', () => {
    expect(getErrorMessage({ message: 'duplicate key', code: '23505' })).toBe('duplicate key');
    expect(getErrorMessage(new Error('failed'))).toBe('failed');
    expect(getErrorMessage(null)).toBe('Unknown error');
  });
});
