import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { pickGranularityForSpan, RangeStore } from '@/core/stats';
import { echarts } from '@/shared/echarts';
import { TrendChartPanelComponent } from './trend-chart-panel.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

describe('TrendChartPanelComponent', () => {
  let fixture: ComponentFixture<TrendChartPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrendChartPanelComponent],
      providers: [provideRouter([]), provideEchartsCore({ echarts })],
    }).compileComponents();

    fixture = TestBed.createComponent(TrendChartPanelComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders income/expense as 2-decimal EUR through the shared tooltip formatter (TICKET-STAT-12)', () => {
    const option = fixture.componentInstance['chartOption']();
    const tooltip = option['tooltip'] as { formatter: (params: unknown) => string };

    const result = tooltip.formatter([
      { axisValueLabel: '2026-07', marker: '●', seriesName: 'Income', value: 1234.5600000000002 },
      { axisValueLabel: '2026-07', marker: '●', seriesName: 'Expense', value: -50 },
    ]);

    expect(result).toBe('2026-07<br/>●Income: €1,234.56<br/>●Expense: -€50.00');
  });

  it('defaults its local granularity control from pickGranularityForSpan for the current shared date range (TICKET-STAT-15)', () => {
    const rangeStore = TestBed.inject(RangeStore);
    const expected = pickGranularityForSpan(rangeStore.from(), rangeStore.to());

    expect(fixture.componentInstance['granularity']()).toBe(expected);
  });

  it("changing its local granularity control changes only its own chart's buckets (TICKET-STAT-15)", () => {
    fixture.componentInstance['granularity'].set('day');
    const bucketCountAsDay = (
      fixture.componentInstance['chartOption']()['xAxis'] as { data: string[] }
    ).data.length;

    fixture.componentInstance['granularity'].set('month');
    const bucketCountAsMonth = (
      fixture.componentInstance['chartOption']()['xAxis'] as { data: string[] }
    ).data.length;

    expect(bucketCountAsMonth).toBe(1);
    expect(bucketCountAsMonth).not.toBe(bucketCountAsDay);
  });
});
