import { describe, expect, it } from 'vitest';

import { getHadithNumberQuery, getPrimaryHadithNumber } from './hadith.service';

describe('getHadithNumberQuery', () => {
  it('detects exact hadith number searches', () => {
    expect(getHadithNumberQuery('5105')).toBe('5105');
    expect(getHadithNumberQuery('9')).toBe('9');
    expect(getHadithNumberQuery('#5105')).toBe('5105');
    expect(getHadithNumberQuery('# 5105')).toBe('5105');
  });

  it('ignores non-number keyword searches', () => {
    expect(getHadithNumberQuery('hadith 5105')).toBeNull();
    expect(getHadithNumberQuery('intention')).toBeNull();
    expect(getHadithNumberQuery('#')).toBeNull();
  });
});

describe('getPrimaryHadithNumber', () => {
  it('uses the first number for grouped source records', () => {
    expect(getPrimaryHadithNumber('272, 273')).toBe('272');
    expect(getPrimaryHadithNumber('299, 300, 301')).toBe('299');
  });

  it('keeps a normal number unchanged', () => {
    expect(getPrimaryHadithNumber('5105')).toBe('5105');
    expect(getPrimaryHadithNumber('')).toBeNull();
  });
});
