import { bucketedZoomAxisOption } from './bucketed-axis-option';
import { legendOption } from './legend-option';

type Legend = {
  type?: string;
  top?: number;
  bottom?: number;
  data?: string[];
  selected?: Record<string, boolean>;
};
const legendOf = (
  placement: 'top' | 'bottom',
  names?: readonly string[],
  hidden?: readonly string[],
): Legend => legendOption(names, placement, hidden).legend as Legend;

describe('legendOption (TICKET-STAT-26)', () => {
  it('scroll-types every legend, so a long series list pages instead of eating the chart', () => {
    expect(legendOf('top', ['A', 'B']).type).toBe('scroll');
    expect(legendOf('bottom').type).toBe('scroll');
  });

  it('anchors to the edge it was asked for, and only that edge', () => {
    const top = legendOf('top', ['A']);
    expect(top.top).toBe(8);
    expect(top.bottom).toBeUndefined();

    const bottom = legendOf('bottom');
    expect(bottom.bottom).toBe(0);
    expect(bottom.top).toBeUndefined();
  });

  it('reserves more grid than the strip it anchors, so the plot can never run under it', () => {
    // The offset has to clear the strip's own inset plus its height; asserting "greater than the
    // inset" is the invariant that matters — an offset equal to the inset would overlap exactly.
    const top = legendOption(['A'], 'top');
    expect(top.gridOffset).toBeGreaterThan((top.legend as Legend).top ?? 0);
    expect(top.gridOffset).toBeGreaterThanOrEqual(48);

    const bottom = legendOption(undefined, 'bottom');
    expect(bottom.gridOffset).toBeGreaterThan((bottom.legend as Legend).bottom ?? 0);
  });

  it('passes the series names through when given them, and omits `data` when not', () => {
    expect(legendOf('top', ['Rent', 'Groceries']).data).toEqual(['Rent', 'Groceries']);
    // The Net vs gross charts let echarts derive the names from `series`.
    expect(legendOf('bottom').data).toBeUndefined();
  });

  it('reserves the same space for ten names as for two — the legend pages rather than growing', () => {
    const ten = Array.from({ length: 10 }, (_, i) => `Account ${i + 1}`);

    const many = legendOption(ten, 'top');
    const few = legendOption(['A', 'B'], 'top');

    expect((many.legend as Legend).type).toBe('scroll');
    expect((many.legend as Legend).data).toHaveLength(10);
    expect(many.gridOffset).toBe(few.gridOffset);
  });

  it('states the selection so a notMerge rebuild restores it instead of clearing it (TICKET-STAT-27)', () => {
    // `NgxEchartsDirective` applies `[options]` with `setOption(option, true)`, which discards
    // echarts' own legend state — an option silent about `selected` puts every hidden series back.
    expect(legendOf('top', ['Checking', 'Savings'], ['Savings']).selected).toEqual({
      Checking: true,
      Savings: false,
    });
  });

  it('marks everything shown when nothing is hidden, and ignores a hidden name it does not draw', () => {
    expect(legendOf('top', ['Checking', 'Savings']).selected).toEqual({
      Checking: true,
      Savings: true,
    });
    expect(legendOf('top', ['Checking'], ['Gone']).selected).toEqual({ Checking: true });
  });

  it('states no selection for a legend echarts derives itself — there are no names to state it over', () => {
    expect(legendOf('bottom', undefined, ['Savings']).selected).toBeUndefined();
  });

  it('keeps the Net vs gross geometry byte-for-byte — bottom: 0 against a grid.bottom of 48', () => {
    const { legend, gridOffset } = legendOption(undefined, 'bottom');

    expect((legend as Legend).bottom).toBe(0);
    expect(gridOffset).toBe(48);
  });
});

describe('bucketedZoomAxisOption grid.top (TICKET-STAT-26)', () => {
  const gridOf = (option: unknown): { top: number } => (option as { grid: { top: number } }).grid;

  it("defaults to today's 48 when the caller passes nothing", () => {
    expect(gridOf(bucketedZoomAxisOption(['2026-01'], { startValue: 0, endValue: 0 })).top).toBe(
      48,
    );
  });

  it("takes the caller's offset, so a chart with a legend can reserve the strip", () => {
    const { gridOffset } = legendOption(['A'], 'top');

    expect(
      gridOf(bucketedZoomAxisOption(['2026-01'], { startValue: 0, endValue: 0 }, gridOffset)).top,
    ).toBe(gridOffset);
  });
});
