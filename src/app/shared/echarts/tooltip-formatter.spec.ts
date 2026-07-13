import { formatAxisTooltip } from './tooltip-formatter';

describe('formatAxisTooltip', () => {
  it('formats every series in the hovered bucket as 2-decimal EUR (multi-series axis trigger)', () => {
    const result = formatAxisTooltip([
      { axisValueLabel: '2026-01', marker: '●', seriesName: 'Checking', value: 1234.5600000000002 },
      { axisValueLabel: '2026-01', marker: '●', seriesName: 'Savings', value: -50 },
    ]);

    expect(result).toBe('2026-01<br/>●Checking: €1,234.56<br/>●Savings: -€50.00');
  });

  it('formats a single-series axis trigger the same way, without wrapping it in an array first', () => {
    const result = formatAxisTooltip({
      axisValueLabel: '2026-02',
      marker: '●',
      seriesName: 'Checking',
      value: 1000,
    });

    expect(result).toBe('2026-02<br/>●Checking: €1,000.00');
  });
});
