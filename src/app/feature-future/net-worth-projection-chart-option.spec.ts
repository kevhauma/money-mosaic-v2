import type { NetWorthProjectionPoint } from '@/core/stats';
import { HIDDEN_AMOUNT_TEXT } from '@/shared/utils';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { buildNetWorthProjectionChartOption } from './net-worth-projection-chart-option';

const point = (
  date: string,
  balance: number,
  purchases: NetWorthProjectionPoint['purchases'] = [],
): NetWorthProjectionPoint => ({ bucketKey: date.slice(0, 7), date, balance, purchases });

const points: NetWorthProjectionPoint[] = [
  point('2026-08-13', 1000),
  point('2026-09-30', 1200, [{ goalId: 1, name: 'Camera', amount: 500 }]),
  point('2026-10-31', 900),
];

type Series = { name: string; data: number[]; label?: { formatter: (p: unknown) => string } };
const seriesOf = (option: Record<string, unknown>): Series[] => option['series'] as Series[];

const tooltipOf = (option: Record<string, unknown>) =>
  (option['tooltip'] as { formatter: (params: unknown) => string }).formatter;

describe('buildNetWorthProjectionChartOption', () => {
  withCleanFormatSettings();

  it('plots the projected balances as one line, on month labels', () => {
    const option = buildNetWorthProjectionChartOption({
      points,
      safetyNetAmount: 0,
      privacyMode: false,
    });

    expect(seriesOf(option)[0].data).toEqual([1000, 1200, 900]);
    expect((option['xAxis'] as { data: string[] }).data).toEqual([
      'August 2026',
      'September 2026',
      'October 2026',
    ]);
  });

  it('labels the month a goal is bought, and nothing on the others', () => {
    const option = buildNetWorthProjectionChartOption({
      points,
      safetyNetAmount: 0,
      privacyMode: false,
    });
    const formatter = seriesOf(option)[0].label!.formatter;

    expect(formatter({ dataIndex: 1 })).toBe('Camera · €500.00');
    expect(formatter({ dataIndex: 0 })).toBe('');
    expect(formatter({ dataIndex: 2 })).toBe('');
  });

  it('draws the safety net as its own dashed line only when one is set', () => {
    const withNet = buildNetWorthProjectionChartOption({
      points,
      safetyNetAmount: 750,
      privacyMode: false,
    });
    const withoutNet = buildNetWorthProjectionChartOption({
      points,
      safetyNetAmount: 0,
      privacyMode: false,
    });

    expect(seriesOf(withNet)).toHaveLength(2);
    expect(seriesOf(withNet)[1]).toMatchObject({ name: 'Safety net', data: [750, 750, 750] });
    expect(seriesOf(withoutNet)).toHaveLength(1);
  });

  it('reports the projected balance in the tooltip, and names the goal bought that month', () => {
    const option = buildNetWorthProjectionChartOption({
      points,
      safetyNetAmount: 0,
      privacyMode: false,
    });
    const formatter = tooltipOf(option);

    expect(formatter([{ dataIndex: 0 }])).toBe('August 2026<br/>Projected: €1,000.00');
    expect(formatter([{ dataIndex: 1 }])).toBe(
      'September 2026<br/>Projected: €1,200.00<br/>Buying Camera · €500.00',
    );
  });

  it('withholds every figure under privacy mode — labels, tooltip and axis are data, not styled DOM', () => {
    const option = buildNetWorthProjectionChartOption({
      points,
      safetyNetAmount: 750,
      privacyMode: true,
    });

    expect(seriesOf(option)[0].label!.formatter({ dataIndex: 1 })).toBe(
      `Camera · ${HIDDEN_AMOUNT_TEXT}`,
    );
    expect(tooltipOf(option)([{ dataIndex: 1 }])).toContain(HIDDEN_AMOUNT_TEXT);
    expect(tooltipOf(option)([{ dataIndex: 1 }])).not.toContain('1,200');
    expect(
      (option['yAxis'] as { axisLabel: { formatter: () => string } }).axisLabel.formatter(),
    ).toBe(HIDDEN_AMOUNT_TEXT);
  });

  it('registers no echarts module beyond the shared setup — no markPoint or markLine', () => {
    const option = buildNetWorthProjectionChartOption({
      points,
      safetyNetAmount: 750,
      privacyMode: false,
    });

    for (const series of seriesOf(option) as unknown as Record<string, unknown>[]) {
      expect(series['markPoint']).toBeUndefined();
      expect(series['markLine']).toBeUndefined();
    }
  });

  it('survives an empty projection rather than throwing', () => {
    const option = buildNetWorthProjectionChartOption({
      points: [],
      safetyNetAmount: 0,
      privacyMode: false,
    });

    expect(seriesOf(option)[0].data).toEqual([]);
    expect(tooltipOf(option)([{ dataIndex: 0 }])).toBe('');
  });
});
