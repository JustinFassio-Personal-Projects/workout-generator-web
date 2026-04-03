/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { possessiveEnglish, timelineHeadingWithPossessive } from './possessive-label';

describe('possessive-label', () => {
  it('possessiveEnglish adds apostrophe-s when name does not end in s', () => {
    expect(possessiveEnglish('Alex')).toBe("Alex's");
  });

  it('possessiveEnglish uses trailing apostrophe only when name ends in s (case insensitive)', () => {
    expect(possessiveEnglish('James')).toBe("James'");
    expect(possessiveEnglish('iris')).toBe("iris'");
  });

  it('timelineHeadingWithPossessive falls back to Timeline when empty', () => {
    expect(timelineHeadingWithPossessive(null)).toBe('Timeline');
    expect(timelineHeadingWithPossessive('')).toBe('Timeline');
    expect(timelineHeadingWithPossessive('   ')).toBe('Timeline');
  });

  it('timelineHeadingWithPossessive combines possessive + Timeline', () => {
    expect(timelineHeadingWithPossessive('Sam')).toBe("Sam's Timeline");
    expect(timelineHeadingWithPossessive('Chris')).toBe("Chris' Timeline");
  });
});
