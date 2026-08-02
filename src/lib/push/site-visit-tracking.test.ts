import { describe, expect, it } from 'vitest';

import { getSiteVisitCutoffIso, shouldCountSiteVisit } from './site-visit-tracking';

describe('site visit tracking', () => {
  it('counts the first known visit for a device', () => {
    expect(shouldCountSiteVisit(null, '2026-08-02T03:00:00.000Z')).toBe(true);
  });

  it('throttles visits inside the same 30 minute window', () => {
    expect(
      shouldCountSiteVisit(
        '2026-08-02T03:00:00.000Z',
        '2026-08-02T03:29:59.000Z'
      )
    ).toBe(false);
  });

  it('counts a new visit after the 30 minute window', () => {
    expect(
      shouldCountSiteVisit(
        '2026-08-02T03:00:00.000Z',
        '2026-08-02T03:30:00.000Z'
      )
    ).toBe(true);
    expect(getSiteVisitCutoffIso('2026-08-02T03:30:00.000Z')).toBe(
      '2026-08-02T03:00:00.000Z'
    );
  });
});
