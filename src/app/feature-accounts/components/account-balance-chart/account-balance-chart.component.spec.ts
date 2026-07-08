import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import type { Account } from '@/core/data-access';
import { echarts } from '@/shared/echarts';
import {
  AccountBalanceChartComponent,
  buildAccountBalanceChartOption,
} from './account-balance-chart.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const account: Account = {
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 1000,
  openingBalanceDate: '2026-01-01',
  color: '#3366ff',
  icon: 'wallet',
  archived: false,
};

describe('AccountBalanceChartComponent', () => {
  let fixture: ComponentFixture<AccountBalanceChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountBalanceChartComponent],
      providers: [provideRouter([]), provideEchartsCore({ echarts })],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountBalanceChartComponent);
    fixture.componentRef.setInput('account', account);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('buildAccountBalanceChartOption', () => {
  it("colours its single line series with the account's own colour and an x-axis dataZoom", () => {
    const option = buildAccountBalanceChartOption(
      account,
      [
        { bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 1000 },
        { bucketKey: '2026-02', bucketEnd: '2026-02-28', netWorth: 1200 },
      ],
      { startValue: 0, endValue: 1 },
    );

    expect(option['series']).toEqual([{ type: 'line', data: [1000, 1200], color: '#3366ff' }]);
    const dataZoom = option['dataZoom'] as { xAxisIndex: number }[];
    expect(dataZoom).toHaveLength(2);
    expect(dataZoom.every((zoom) => zoom.xAxisIndex === 0)).toBe(true);
  });

  it('applies the given zoom window to both dataZoom entries', () => {
    const option = buildAccountBalanceChartOption(
      account,
      [
        { bucketKey: '2026-01', bucketEnd: '2026-01-31', netWorth: 1000 },
        { bucketKey: '2026-02', bucketEnd: '2026-02-28', netWorth: 1200 },
        { bucketKey: '2026-03', bucketEnd: '2026-03-31', netWorth: 1300 },
      ],
      { startValue: 1, endValue: 2 },
    );

    const dataZoom = option['dataZoom'] as { startValue: number; endValue: number }[];
    expect(dataZoom.every((zoom) => zoom.startValue === 1 && zoom.endValue === 2)).toBe(true);
  });
});
