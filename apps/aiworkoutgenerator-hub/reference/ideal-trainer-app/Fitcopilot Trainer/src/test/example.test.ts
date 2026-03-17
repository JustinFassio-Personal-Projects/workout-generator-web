import { describe, it, expect } from 'vitest';

describe('Sanity Check', () => {
  it('should pass this basic test', () => {
    expect(true).toBe(true);
  });

  it('should calculate 1 + 1', () => {
    expect(1 + 1).toBe(2);
  });
});
