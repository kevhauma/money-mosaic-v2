import type { GrossNetGrowthPoint, GrossNetRatioPoint } from '@/core/stats';
import {
  buildGrossNetGrowthChartOption,
  buildTakeHomeChartOption,
  type GrossNetGrowthChartKind,
} from './gross-net-chart-options';

const point = (overrides: Partial<GrossNetRatioPoint> = {}): GrossNetRatioPoint => ({
  bucketKey: '2026-01',
  net: 2160,
  gross: 3000,
  ratio: 0.72,
  ...overrides,
});

const growthPoint = (overrides: Partial<GrossNetGrowthPoint> = {}): GrossNetGrowthPoint => ({
  bucketKey: '2026-01',
  grossValue: 3000,
  netValue: 2160,
  grossFromStart: 0,
  netFromStart: 0,
  grossPctFromStart: 0,
  netPctFromStart: 0,
  ...overrides,
});

/** ECharts' option type indexes to `unknown`, so assertions narrow through a local shape. */
type ChartOption = {
  series: {
    name: string;
    type: string;
    stack?: string;
    areaStyle?: object;
    markLine?: object;
    itemStyle?: { color: string };
    data: (number | null)[];
    connectNulls: boolean;
  }[];
  tooltip: { formatter: (params: { dataIndex: number }[]) => string };
  xAxis: { data: string[] };
  yAxis: { min?: number; max?: number; axisLabel: { formatter: (value: number) => string } };
};

const GROSS = '#8451c9';

describe('buildTakeHomeChartOption (FR-INC-11, TICKET-INC-11/TICKET-INC-14)', () => {
  const build = (points: GrossNetRatioPoint[], grossColor = GROSS) =>
    buildTakeHomeChartOption(points, grossColor) as unknown as ChartOption;

  it('plots one point per month, as a kept/withheld pair', () => {
    const option = build([point({ bucketKey: '2026-01' }), point({ bucketKey: '2026-02' })]);

    expect(option.xAxis.data).toEqual(['2026-01', '2026-02']);
    expect(option.series[0].data).toEqual([0.72, 0.72]);
    expect(option.series[1].data).toEqual([0.28, 0.28]);
    expect(option.series[0].type).toBe('line');
  });

  it('pins the axis to a full 0–100% rather than letting echarts fit the data', () => {
    // Data that would otherwise auto-fit to a ~6-point axis and render as dramatic hills.
    const option = build([
      point({ bucketKey: '2026-01', ratio: 0.82 }),
      point({ bucketKey: '2026-02', ratio: 0.85 }),
      point({ bucketKey: '2026-03', ratio: 0.88 }),
    ]);

    expect(option.yAxis.min).toBe(0);
    expect(option.yAxis.max).toBe(1);
  });

  it('stacks two named area series that always fill the plot', () => {
    const option = build([point({ ratio: 0.6 }), point({ ratio: 0.9 }), point({ ratio: 0.72 })]);

    expect(option.series.map((entry) => entry.name)).toEqual(['Take-home', 'Withheld']);
    expect(option.series[0].stack).toBe(option.series[1].stack);
    expect(option.series.every((entry) => entry.areaStyle !== undefined)).toBe(true);
    option.series[0].data.forEach((kept, index) => {
      expect((kept as number) + (option.series[1].data[index] as number)).toBeCloseTo(1);
    });
  });

  it('clips a month over 100% to a full band and names the real figure in its tooltip', () => {
    const option = build([point({ net: 3120, gross: 3000, ratio: 1.04 })]);

    expect(option.series[0].data).toEqual([1]);
    expect(option.series[1].data).toEqual([0]);
    expect(option.tooltip.formatter([{ dataIndex: 0 }])).toContain('104%');
    expect(option.tooltip.formatter([{ dataIndex: 0 }])).toContain(
      'More reached the account than the gross entered',
    );
  });

  it('breaks both bands at a month with no gross wage rather than dipping to zero', () => {
    const option = build([
      point({ bucketKey: '2026-01' }),
      point({ bucketKey: '2026-02', gross: null, ratio: null }),
      point({ bucketKey: '2026-03' }),
    ]);

    expect(option.series[0].data).toEqual([0.72, null, 0.72]);
    expect(option.series[1].data).toEqual([0.28, null, 0.28]);
    expect(option.series.every((entry) => entry.connectNulls === false)).toBe(true);
  });

  it('takes the withheld band’s color from the gross-series resolver, not a literal', () => {
    expect(build([point()], '#8451c9').series[1].itemStyle?.color).toBe('#8451c9');
    expect(build([point()], '#e1af37').series[1].itemStyle?.color).toBe('#e1af37');
  });

  it('leaves the take-home band on the theme’s own categorical slot', () => {
    expect(build([point()]).series[0].itemStyle).toBeUndefined();
  });

  it('labels the axis as a percentage', () => {
    expect(build([point()]).yAxis.axisLabel.formatter(0.72)).toBe('72%');
  });

  it('spells out both figures behind a point in its tooltip', () => {
    const tooltip = build([point()]).tooltip.formatter([{ dataIndex: 0 }]);

    expect(tooltip).toContain('2,160');
    expect(tooltip).toContain('3,000');
    expect(tooltip).toContain('72%');
  });

  it('says why a gap is a gap', () => {
    const option = build([point({ gross: null, ratio: null })]);

    expect(option.tooltip.formatter([{ dataIndex: 0 }])).toContain('no gross wage entered');
  });
});

describe('buildGrossNetGrowthChartOption (FR-INC-13, TICKET-INC-16)', () => {
  const build = (
    points: GrossNetGrowthPoint[],
    kind: GrossNetGrowthChartKind,
    grossColor = GROSS,
  ) => buildGrossNetGrowthChartOption(points, kind, grossColor) as unknown as ChartOption;

  const THREE_MONTHS: GrossNetGrowthPoint[] = [
    growthPoint({ bucketKey: '2026-01' }),
    growthPoint({
      bucketKey: '2026-02',
      grossValue: 3300,
      netValue: 2300,
      grossFromStart: 300,
      netFromStart: 140,
      grossPctFromStart: 0.1,
      netPctFromStart: 140 / 2160,
    }),
    growthPoint({
      bucketKey: '2026-03',
      grossValue: null,
      netValue: 2300,
      grossFromStart: null,
      netFromStart: 140,
      grossPctFromStart: null,
      netPctFromStart: 140 / 2160,
    }),
  ];

  it('plots the levels themselves on the absolute chart, with a currency axis', () => {
    const option = build(THREE_MONTHS, 'absolute');

    expect(option.xAxis.data).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(option.series.map((entry) => entry.name)).toEqual(['Net', 'Gross']);
    expect(option.series[0].data).toEqual([2160, 2300, 2300]);
    expect(option.series[1].data).toEqual([3000, 3300, null]);
    expect(option.yAxis.axisLabel.formatter(3000)).toBe('€3,000.00');
  });

  it('plots the distance travelled on the from-start chart, with a currency axis', () => {
    const option = build(THREE_MONTHS, 'fromStart');

    expect(option.series[0].data).toEqual([0, 140, 140]);
    expect(option.series[1].data).toEqual([0, 300, null]);
    expect(option.yAxis.axisLabel.formatter(300)).toBe('€300.00');
  });

  it('plots the same distance as a percentage on the percent chart, with a percent axis', () => {
    const option = build(THREE_MONTHS, 'pctFromStart');

    expect(option.series[1].data).toEqual([0, 0.1, null]);
    expect(option.yAxis.axisLabel.formatter(0.1)).toBe('10%');
  });

  it('draws the baseline on both from-start charts, so “back where I started” is visible', () => {
    expect(build(THREE_MONTHS, 'fromStart').series[0].markLine).toBeDefined();
    expect(build(THREE_MONTHS, 'pctFromStart').series[0].markLine).toBeDefined();
    expect(build(THREE_MONTHS, 'absolute').series[0].markLine).toBeUndefined();
  });

  it('breaks only the gross line over a month with no wage entered', () => {
    const option = build(THREE_MONTHS, 'absolute');

    expect(option.series[1].data[2]).toBeNull();
    expect(option.series[0].data[2]).not.toBeNull();
    expect(option.series.every((entry) => entry.connectNulls === false)).toBe(true);
  });

  it('takes the gross line’s color from the resolver, leaving net on the theme’s slot', () => {
    expect(build(THREE_MONTHS, 'absolute', '#8451c9').series[1].itemStyle?.color).toBe('#8451c9');
    expect(build(THREE_MONTHS, 'absolute', '#e1af37').series[1].itemStyle?.color).toBe('#e1af37');
    expect(build(THREE_MONTHS, 'absolute').series[0].itemStyle).toBeUndefined();
  });

  it('names both figures in the tooltip, and says which one is missing', () => {
    const option = build(THREE_MONTHS, 'absolute');

    expect(option.tooltip.formatter([{ dataIndex: 1 }])).toContain('€3,300.00');
    expect(option.tooltip.formatter([{ dataIndex: 1 }])).toContain('€2,300.00');
    expect(option.tooltip.formatter([{ dataIndex: 2 }])).toContain('no wage entered');
  });
});
