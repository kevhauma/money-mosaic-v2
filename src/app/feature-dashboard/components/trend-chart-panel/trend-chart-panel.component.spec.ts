import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
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
});
