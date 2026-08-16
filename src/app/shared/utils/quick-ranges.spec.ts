import {
  ALL_TIME_QUICK_RANGE_ID,
  QUICK_RANGES,
  quickRangeById,
  resolveQuickRange,
  type QuickRangeExpressionEntry,
  type QuickRangeResolverEntry,
} from './quick-ranges';

const TODAY = '2026-07-15'; // a Wednesday, in ISO week 29 (Mon 2026-07-13 .. Sun 2026-07-19)

describe('QUICK_RANGES catalogue shape', () => {
  it('holds exactly 21 entries, each with a unique id and a label', () => {
    expect(QUICK_RANGES).toHaveLength(21);
    expect(new Set(QUICK_RANGES.map((entry) => entry.id)).size).toBe(21);
    for (const entry of QUICK_RANGES) {
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it('groups entries into the four documented groups, in order', () => {
    expect(QUICK_RANGES.filter((entry) => entry.group === 'relative')).toHaveLength(7);
    expect(QUICK_RANGES.filter((entry) => entry.group === 'previous-period')).toHaveLength(6);
    expect(QUICK_RANGES.filter((entry) => entry.group === 'current-period')).toHaveLength(7);
    expect(QUICK_RANGES.filter((entry) => entry.group === 'everything')).toHaveLength(1);
  });

  it('every entry carries either an expression pair, a resolver, or (all-time alone) is external — never nothing', () => {
    for (const entry of QUICK_RANGES) {
      const hasExpression = 'fromExpr' in entry && 'toExpr' in entry;
      const hasResolver = 'resolve' in entry;
      const isExternal = 'external' in entry;
      expect([hasExpression, hasResolver, isExternal].filter(Boolean)).toHaveLength(1);
    }
  });

  it('all-time is the only external entry, and it is steppingDisabled', () => {
    const externalEntries = QUICK_RANGES.filter((entry) => 'external' in entry);
    expect(externalEntries.map((entry) => entry.id)).toEqual([ALL_TIME_QUICK_RANGE_ID]);
    expect(quickRangeById(ALL_TIME_QUICK_RANGE_ID)?.steppingDisabled).toBe(true);
  });

  it('quickRangeById finds every catalogue entry by id and returns undefined for an unknown one', () => {
    for (const entry of QUICK_RANGES) {
      expect(quickRangeById(entry.id)).toBe(entry);
    }
    expect(quickRangeById('custom')).toBeUndefined();
    expect(quickRangeById('not-a-real-id')).toBeUndefined();
  });
});

describe('resolveQuickRange: every non-fiscal, non-all-time entry resolves against a fixed today', () => {
  // Quarters (`this-quarter`, `previous-quarter`) resolve through a resolver, not a STAT-35
  // expression pair — STAT-35's grammar deliberately has no quarter unit (see its own Notes), so
  // "every non-fiscal entry resolves through STAT-35's expression resolver" (as this ticket's AC
  // originally read) cannot hold for quarters. Both still resolve purely from `todayIso`, with no
  // dependency on the fiscal setting, which is the property this describe block actually verifies.
  const cases: { id: string; from: string; to: string }[] = [
    { id: 'last-7-days', from: '2026-07-09', to: '2026-07-15' },
    { id: 'last-30-days', from: '2026-06-16', to: '2026-07-15' },
    { id: 'last-90-days', from: '2026-04-17', to: '2026-07-15' },
    { id: 'last-6-months', from: '2026-01-15', to: '2026-07-15' },
    { id: 'last-1-year', from: '2025-07-15', to: '2026-07-15' },
    { id: 'last-2-years', from: '2024-07-15', to: '2026-07-15' },
    { id: 'last-5-years', from: '2021-07-15', to: '2026-07-15' },
    { id: 'previous-week', from: '2026-07-06', to: '2026-07-12' },
    { id: 'previous-month', from: '2026-06-01', to: '2026-06-30' },
    { id: 'previous-quarter', from: '2026-04-01', to: '2026-06-30' },
    { id: 'previous-year', from: '2025-01-01', to: '2025-12-31' },
    { id: 'this-week', from: '2026-07-13', to: '2026-07-19' },
    { id: 'this-week-so-far', from: '2026-07-13', to: '2026-07-15' },
    { id: 'this-month', from: '2026-07-01', to: '2026-07-31' },
    { id: 'this-month-so-far', from: '2026-07-01', to: '2026-07-15' },
    { id: 'this-quarter', from: '2026-07-01', to: '2026-09-30' },
    { id: 'this-year', from: '2026-01-01', to: '2026-12-31' },
    { id: 'this-year-so-far', from: '2026-01-01', to: '2026-07-15' },
  ];

  it.each(cases)('resolves "$id"', ({ id, from, to }) => {
    const entry = quickRangeById(id) as QuickRangeExpressionEntry | QuickRangeResolverEntry;
    expect(resolveQuickRange(entry, TODAY, 1)).toEqual({ from, to });
  });
});

describe('renamed ranges resolve to the same window their old id did', () => {
  // Ground truth taken from the deleted `resolvePresetRange`'s own spec (git history) — each case
  // reuses that spec's exact "today" and expected boundaries, so this is a byte-for-byte parity
  // check against the function this catalogue replaces, not a re-derivation.
  it('this-month unchanged (was already this-month)', () => {
    const entry = quickRangeById('this-month') as QuickRangeExpressionEntry;
    expect(resolveQuickRange(entry, '2026-07-15', 1)).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
    });
  });

  it('previous-month (renamed from last-month) resolves identically across a year boundary', () => {
    const entry = quickRangeById('previous-month') as QuickRangeExpressionEntry;
    expect(resolveQuickRange(entry, '2026-01-15', 1)).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('previous-quarter (renamed from last-quarter) resolves identically across a year boundary', () => {
    const entry = quickRangeById('previous-quarter') as QuickRangeResolverEntry;
    expect(resolveQuickRange(entry, '2026-01-15', 1)).toEqual({
      from: '2025-10-01',
      to: '2025-12-31',
    });
  });

  it('previous-year (renamed from last-year) resolves identically', () => {
    const entry = quickRangeById('previous-year') as QuickRangeExpressionEntry;
    expect(resolveQuickRange(entry, '2026-08-01', 1)).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    });
  });

  it('this-year-so-far (renamed from year-to-date) resolves identically', () => {
    const entry = quickRangeById('this-year-so-far') as QuickRangeExpressionEntry;
    expect(resolveQuickRange(entry, '2026-04-10', 1)).toEqual({
      from: '2026-01-01',
      to: '2026-04-10',
    });
  });

  it('last-30-days (renamed from last-31-days) is deliberately one day narrower, not identical', () => {
    // Old `resolvePresetRange('last-31-days', '2026-07-15')` was { from: '2026-06-15', to: '2026-07-15' }
    // (31 inclusive days) — the ticket's own rename rationale ("31 was an artefact of month-length
    // hedging... every comparable tool uses 30") requires a genuine 30-day span, not the same window.
    const entry = quickRangeById('last-30-days') as QuickRangeExpressionEntry;
    expect(resolveQuickRange(entry, '2026-07-15', 1)).toEqual({
      from: '2026-06-16',
      to: '2026-07-15',
    });
  });

  it('last-1-year (renamed from last-365-days) is also NOT byte-identical, unlike the ticket assumed', () => {
    // Old `resolvePresetRange('last-365-days', '2026-07-15')` was { from: '2025-07-16', to: '2026-07-15' }
    // — a fixed 365-inclusive-day span. `now-1y` is a genuine calendar-year offset instead (same
    // day-of-month one year back), which is *always* a 366- or 367-inclusive-day span depending on
    // whether a Feb 29 falls in between — never 365. So this pair can never coincide for any "today",
    // the same permanent one-(or-two)-day gap `last-30-days` has, just not named in the ticket's own
    // "the only one in this table" claim. Recorded as evidence on TICKET-STAT-37's AC #3.
    const entry = quickRangeById('last-1-year') as QuickRangeExpressionEntry;
    expect(resolveQuickRange(entry, '2026-07-15', 1)).toEqual({
      from: '2025-07-15',
      to: '2026-07-15',
    });
  });

  it('this-quarter unchanged (was already this-quarter)', () => {
    const entry = quickRangeById('this-quarter') as QuickRangeResolverEntry;
    expect(resolveQuickRange(entry, '2026-08-01', 1)).toEqual({
      from: '2026-07-01',
      to: '2026-09-30',
    });
  });

  it('this-week unchanged (was already this-week)', () => {
    const entry = quickRangeById('this-week') as QuickRangeExpressionEntry;
    expect(resolveQuickRange(entry, '2026-07-03', 1)).toEqual({
      from: '2026-06-29',
      to: '2026-07-05',
    });
  });
});

describe('"so far" variants end today, unlike their whole-period twins', () => {
  it("this-month-so-far ends today while this-month ends on the month's last day", () => {
    const thisMonth = quickRangeById('this-month') as QuickRangeExpressionEntry;
    const thisMonthSoFar = quickRangeById('this-month-so-far') as QuickRangeExpressionEntry;

    expect(resolveQuickRange(thisMonth, TODAY, 1)).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
    });
    expect(resolveQuickRange(thisMonthSoFar, TODAY, 1)).toEqual({
      from: '2026-07-01',
      to: '2026-07-15',
    });
  });

  it("this-week-so-far ends today while this-week ends on the week's last day", () => {
    const thisWeek = quickRangeById('this-week') as QuickRangeExpressionEntry;
    const thisWeekSoFar = quickRangeById('this-week-so-far') as QuickRangeExpressionEntry;

    expect(resolveQuickRange(thisWeek, TODAY, 1)).toEqual({ from: '2026-07-13', to: '2026-07-19' });
    expect(resolveQuickRange(thisWeekSoFar, TODAY, 1)).toEqual({
      from: '2026-07-13',
      to: '2026-07-15',
    });
  });
});

describe('fiscal resolution', () => {
  it('with fiscalYearStartMonth unset (January), previous-fiscal-quarter/-year resolve identically to previous-quarter/-year', () => {
    const previousQuarter = resolveQuickRange(
      quickRangeById('previous-quarter') as QuickRangeResolverEntry,
      TODAY,
      1,
    );
    const previousFiscalQuarter = resolveQuickRange(
      quickRangeById('previous-fiscal-quarter') as QuickRangeResolverEntry,
      TODAY,
      1,
    );
    const previousYear = resolveQuickRange(
      quickRangeById('previous-year') as QuickRangeExpressionEntry,
      TODAY,
      1,
    );
    const previousFiscalYear = resolveQuickRange(
      quickRangeById('previous-fiscal-year') as QuickRangeResolverEntry,
      TODAY,
      1,
    );

    expect(previousFiscalQuarter).toEqual(previousQuarter);
    expect(previousFiscalYear).toEqual(previousYear);
  });

  it('with fiscalYearStartMonth = 4 (April), previous-fiscal-year evaluated in May 2026 resolves to 2025-04-01 – 2026-03-31', () => {
    const entry = quickRangeById('previous-fiscal-year') as QuickRangeResolverEntry;
    expect(resolveQuickRange(entry, '2026-05-20', 4)).toEqual({
      from: '2025-04-01',
      to: '2026-03-31',
    });
  });

  it('with fiscalYearStartMonth = 4 (April), previous-fiscal-quarter evaluated in May 2026 resolves to 2026-01-01 – 2026-03-31', () => {
    const entry = quickRangeById('previous-fiscal-quarter') as QuickRangeResolverEntry;
    expect(resolveQuickRange(entry, '2026-05-20', 4)).toEqual({
      from: '2026-01-01',
      to: '2026-03-31',
    });
  });

  it('all-time carries no resolver and is unaffected by the fiscal setting — it is resolved externally via computeFullHistoryRange', () => {
    const entry = quickRangeById(ALL_TIME_QUICK_RANGE_ID);
    expect(entry && 'external' in entry).toBe(true);
    expect(entry && 'resolve' in entry).toBe(false);
    expect(entry && 'fromExpr' in entry).toBe(false);
  });
});

describe('catalogue-derived stepping units (replaces the old hand-maintained CALENDAR_UNIT_BY_PRESET)', () => {
  it('calendar-aligned entries carry the calendarUnit RangeStore.shiftRange needs to step by a whole unit', () => {
    const expected: Record<string, string> = {
      'previous-week': 'week',
      'previous-month': 'month',
      'previous-quarter': 'quarter',
      'previous-fiscal-quarter': 'quarter',
      'previous-year': 'year',
      'previous-fiscal-year': 'year',
      'this-week': 'week',
      'this-month': 'month',
      'this-quarter': 'quarter',
      'this-year': 'year',
    };
    for (const [id, unit] of Object.entries(expected)) {
      expect(quickRangeById(id)?.calendarUnit).toBe(unit);
    }
  });

  it('rolling-window entries carry no calendarUnit — RangeStore falls back to day-count stepping', () => {
    for (const id of [
      'last-7-days',
      'last-30-days',
      'last-90-days',
      'last-6-months',
      'last-1-year',
    ]) {
      expect(quickRangeById(id)?.calendarUnit).toBeUndefined();
    }
  });

  it('"so far" variants and all-time are steppingDisabled — no fixed, repeatable length', () => {
    for (const id of ['this-week-so-far', 'this-month-so-far', 'this-year-so-far', 'all-time']) {
      expect(quickRangeById(id)?.steppingDisabled).toBe(true);
    }
  });

  it('every other entry is not steppingDisabled', () => {
    const disabled = new Set([
      'this-week-so-far',
      'this-month-so-far',
      'this-year-so-far',
      'all-time',
    ]);
    for (const entry of QUICK_RANGES) {
      if (disabled.has(entry.id)) continue;
      expect(entry.steppingDisabled).toBeUndefined();
    }
  });
});
