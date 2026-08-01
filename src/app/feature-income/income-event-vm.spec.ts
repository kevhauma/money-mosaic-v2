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
    expect(vm.when).toBe('03/01/2026');
  });

  it('states a decrease as a drop', () => {
    const vm = buildIncomeEventVm(PAY_CUT, categoriesById);

    expect(vm.message).toContain('dropped');
    expect(vm.message).toContain('14.3%');
  });

  it('reports a bonus with its amount', () => {
    expect(buildIncomeEventVm(BONUS, categoriesById).message).toContain('€1,800.00');
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
      locale: 'en-GB',
    });

    const raise = buildIncomeEventVm(RAISE, categoriesById);
    const bonus = buildIncomeEventVm(BONUS, categoriesById);

    expect(raise.message).toContain('$2,500.00');
    expect(raise.message).not.toContain('€');
    expect(bonus.message).not.toContain('€');
    // en-GB puts the day first, so a hardcoded en-US date would show as 03/01/2026 here too.
    expect(raise.when).toBe('01/03/2026');
  });

  it('gives each kind its own icon and tone, so the rail is scannable', () => {
    const kinds = [RAISE, PAY_CUT, BONUS, STOPPED].map((event) =>
      buildIncomeEventVm(event, categoriesById),
    );

    expect(new Set(kinds.map((vm) => vm.icon)).size).toBe(4);
    expect(kinds[0].toneClass).toBe('text-success');
    expect(kinds[1].toneClass).toBe('text-warning');
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
