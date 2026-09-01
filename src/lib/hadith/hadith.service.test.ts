import { describe, expect, it } from 'vitest';

import { getHadithNumberQuery } from './hadith.service';

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
