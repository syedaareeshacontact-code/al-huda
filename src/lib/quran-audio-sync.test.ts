import { describe, expect, it } from 'vitest';

import {
  findTimingAtMs,
  getNextUrduAyahNumber,
  parseChapterTimings,
} from './quran-audio-sync';

describe('parseChapterTimings', () => {
  it('parses valid timing rows and skips boundary-only segments', () => {
    expect(
      parseChapterTimings([
        {
          verse_key: '2:1',
          timestamp_from: 0,
          timestamp_to: 1000,
          segments: [
            [1, 0, 400],
            [2, 400, 900],
            [2, 900],
          ],
        },
      ])
    ).toEqual({
      ayahs: [{ ayahNumber: 1, fromMs: 0, toMs: 1000 }],
      words: [
        { ayahNumber: 1, wordIndex: 1, fromMs: 0, toMs: 400 },
        { ayahNumber: 1, wordIndex: 2, fromMs: 400, toMs: 900 },
      ],
    });
  });

  it('repairs isolated forward index corruption without changing repetitions', () => {
    const parsed = parseChapterTimings([
      {
        verse_key: '2:282',
        timestamp_from: 0,
        timestamp_to: 700,
        segments: [
          [1, 0, 100],
          [2, 100, 200],
          [118, 200, 300],
          [4, 300, 400],
          [2, 400, 500],
          [3, 500, 600],
        ],
      },
    ]);

    expect(parsed.words.map((timing) => timing.wordIndex)).toEqual([1, 2, 3, 4, 2, 3]);
  });
});

describe('findTimingAtMs', () => {
  const timings = [
    { fromMs: 0, toMs: 100, value: 'first' },
    { fromMs: 100, toMs: 180, value: 'second' },
    { fromMs: 200, toMs: 300, value: 'third' },
  ];

  it('uses binary search at exact timing boundaries', () => {
    expect(findTimingAtMs(timings, 99)?.value).toBe('first');
    expect(findTimingAtMs(timings, 100)?.value).toBe('second');
    expect(findTimingAtMs(timings, 200)?.value).toBe('third');
  });

  it('returns null in a timing gap unless grace covers it', () => {
    expect(findTimingAtMs(timings, 190)).toBeNull();
    expect(findTimingAtMs(timings, 190, 20)?.value).toBe('second');
  });
});

describe('getNextUrduAyahNumber', () => {
  it('advances within the surah and stops after the last ayah', () => {
    expect(getNextUrduAyahNumber(1, 286)).toBe(2);
    expect(getNextUrduAyahNumber(20, 286)).toBe(21);
    expect(getNextUrduAyahNumber(285, 286)).toBe(286);
    expect(getNextUrduAyahNumber(286, 286)).toBeNull();
  });

  it('rejects invalid bounds', () => {
    expect(getNextUrduAyahNumber(null, 286)).toBeNull();
    expect(getNextUrduAyahNumber(0, 286)).toBeNull();
    expect(getNextUrduAyahNumber(1, 0)).toBeNull();
  });
});
