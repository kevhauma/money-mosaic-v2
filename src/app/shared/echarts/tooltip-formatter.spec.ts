import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { formatAxisTooltip } from './tooltip-formatter';

describe('formatAxisTooltip', () => {
  withCleanFormatSettings();

  it('formats every series in the hovered bucket as 2-decimal EUR (multi-series axis trigger)', () => {
    const result = formatAxisTooltip([
      { axisValueLabel: '2026-01', marker: '●', seriesName: 'Checking', value: 1234.5600000000002 },
      { axisValueLabel: '2026-01', marker: '●', seriesName: 'Savings', value: -50 },
    ]);

    expect(result).toBe('2026-01<br/>●Checking: €1.234,56<br/>●Savings: -€50,00');
  });

  it('formats a single-series axis trigger the same way, without wrapping it in an array first', () => {
    const result = formatAxisTooltip({
      axisValueLabel: '2026-02',
      marker: '●',
      seriesName: 'Checking',
      value: 1000,
    });

    expect(result).toBe('2026-02<br/>●Checking: €1.000,00');
  });

  it('skips a series with no point at the hovered category instead of printing NaN', () => {
    const result = formatAxisTooltip([
      { axisValueLabel: '2026-03-14', marker: '●', seriesName: 'Scheduled', value: null },
      { axisValueLabel: '2026-03-14', marker: '●', seriesName: 'Actual', value: 9800 },
    ]);

    expect(result).toBe('2026-03-14<br/>●Actual: €9.800,00');
  });

  it('keeps the bucket header when every series is empty at the hovered category', () => {
    const result = formatAxisTooltip([
      { axisValueLabel: '2026-03-14', marker: '●', seriesName: 'Scheduled', value: null },
    ]);

    expect(result).toBe('2026-03-14');
  });

  it('still renders a legitimate zero, which is a value and not a gap', () => {
    const result = formatAxisTooltip([
      { axisValueLabel: '2026-04', marker: '●', seriesName: 'Scheduled', value: 0 },
    ]);

    expect(result).toBe('2026-04<br/>●Scheduled: €0,00');
  });
});
