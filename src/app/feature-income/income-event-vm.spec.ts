import type { Category } from '@/core/data-access';
import type { IncomeEvent } from '@/core/stats';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { buildIncomeEventVm, buildIncomeEventYearVms } from './income-event-vm';

const salary: Category = {
  id: 1,
  name: 'Salary',
  kind: 'income',
  color: '#34d399',
  icon: 'cash',
  archived: false,
  isSystem: true,
  sortOrder: 1,
};

const categoriesById = new Map<number, Category>([[1, salary]]);

const RAISE: IncomeEvent = {
  kind: 'raise',
  bucketKey: '2026-03',
  categoryId: 1,
  changedAtBucketKey: '2026-03',
  fromAvg: 2500,
  toAvg: 2800,
  pctChange: 0.12,
};

const PAY_CUT: IncomeEvent = {
  ...RAISE,
  kind: 'pay-cut',
  fromAvg: 2800,
  toAvg: 2400,
  pctChange: -0.143,
};

const BONUS: IncomeEvent = { kind: 'bonus', bucketKey: '2025-12', amount: 1800 };

const NET_RISE: IncomeEvent = {
  kind: 'wage-change',
  series: 'net',
  bucketKey: '2026-03',
  fromBucketKey: '2026-02',
  from: 2000,
  to: 2100,
  delta: 100,
  pct: 0.05,
};

const STOPPED: IncomeEvent = {
  kind: 'stream-stopped',
  bucketKey: '2025-06',
  categoryId: 1,
  lastSeenBucketKey: '2025-06',
  monthsMissing: 4,
};

afterEach(() => {
  syncFormatSettings({
    currencySymbol: DEFAULT_CURRENCY_SYMBOL,
    currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
    locale: DEFAULT_LOCALE,
  });
});

describe('buildIncomeEventVm (TICKET-INC-17)', () => {
  it('names the category, the size of the move and both amounts for a raise', () => {
    const vm = buildIncomeEventVm(RAISE, categoriesById);

    expect(vm.message).toContain('Salary');
    expect(vm.message).toContain('increased');
    expect(vm.message).toContain('12%');
    expect(vm.message).toContain('€2,500.00');
    expect(vm.message).toContain('€2,800.00');
    // Month only: the rail groups by year, so the year is already in the heading above the row.
    expect(vm.when).toBe('Mar');
  });

  it('states a decrease as a drop', () => {
    const vm = buildIncomeEventVm(PAY_CUT, categoriesById);

    expect(vm.message).toContain('dropped');
    expect(vm.message).toContain('14.3%');
  });

  it('reports a bonus with its amount', () => {
    expect(buildIncomeEventVm(BONUS, categoriesById).message).toContain('€1,800.00');
  });

  it('gives a wage rise columns rather than a sentence, with the dashboard’s delta chip', () => {
    const vm = buildIncomeEventVm(NET_RISE, categoriesById);

    expect(vm.wageChange).toEqual({
      label: 'Net',
      delta: '+€100.00',
      to: '€2,100.00',
      deltaLabel: '5%',
      deltaIcon: 'tablerTriangleFill',
      deltaColor: 'success',
    });
    // The columns *are* the row — no sentence is built for this kind.
    expect(vm.message).toBe('');
  });

  it('points the chip’s triangle down for a cut, keeping the percentage unsigned', () => {
    const vm = buildIncomeEventVm(
      { ...NET_RISE, to: 1900, delta: -100, pct: -0.05 },
      categoriesById,
    );

    expect(vm.wageChange?.deltaIcon).toBe('tablerTriangleInvertedFill');
    // Unsigned like the dashboard's card: the triangle already says which way.
    expect(vm.wageChange?.deltaLabel).toBe('5%');
    expect(vm.wageChange?.deltaColor).toBe('warning');
  });

  it('names the gross figure as gross', () => {
    expect(
      buildIncomeEventVm({ ...NET_RISE, series: 'gross' }, categoriesById).wageChange?.label,
    ).toBe('Gross');
  });

  it('leaves every other kind without a wage-change row', () => {
    for (const event of [RAISE, PAY_CUT, BONUS, STOPPED]) {
      expect(buildIncomeEventVm(event, categoriesById).wageChange).toBeUndefined();
    }
  });

  it('keys a net and a gross move in the same month apart', () => {
    const net = buildIncomeEventVm(NET_RISE, categoriesById).key;
    const gross = buildIncomeEventVm({ ...NET_RISE, series: 'gross' }, categoriesById).key;

    expect(net).not.toBe(gross);
  });

  it('pluralises a stopped stream’s missing months', () => {
    expect(buildIncomeEventVm(STOPPED, categoriesById).message).toContain('4 months with nothing');
    expect(buildIncomeEventVm({ ...STOPPED, monthsMissing: 1 }, categoriesById).message).toContain(
      '1 month with nothing',
    );
  });

  it('falls back to a generic name when the category is gone', () => {
    expect(buildIncomeEventVm(RAISE, new Map()).message).toContain('Income');
    expect(buildIncomeEventVm(STOPPED, new Map()).message).toContain('An income category');
  });

  it('follows the currency and locale settings rather than printing a euro sign', () => {
    syncFormatSettings({
      currencySymbol: '$',
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: 'nl-BE',
    });

    const raise = buildIncomeEventVm(RAISE, categoriesById);
    const bonus = buildIncomeEventVm(BONUS, categoriesById);

    expect(raise.message).toContain('$2.500,00');
    expect(raise.message).not.toContain('€');
    expect(bonus.message).not.toContain('€');
    // The month name follows the locale too — a hardcoded English table would print "Mar" here.
    expect(raise.when).not.toBe('Mar');
    expect(raise.when.toLowerCase()).toContain('mrt');
  });

  it('keys events uniquely, so two in one month never collide', () => {
    const keys = [RAISE, { ...RAISE, categoryId: 2 }, BONUS, STOPPED].map(
      (event) => buildIncomeEventVm(event, categoriesById).key,
    );

    expect(new Set(keys).size).toBe(4);
  });
});

describe('buildIncomeEventYearVms', () => {
  it('maps each year’s events while keeping the sections’ order', () => {
    const years = buildIncomeEventYearVms(
      [
        { year: '2026', events: [RAISE] },
        { year: '2025', events: [BONUS, STOPPED] },
      ],
      categoriesById,
    );

    expect(years.map((section) => section.year)).toEqual(['2026', '2025']);
    expect(years[1].events).toHaveLength(2);
    expect(years[1].events[0].message).toContain('Bonus');
  });
});
