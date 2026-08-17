import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import { AppSettingsRepository, GoalsRepository } from '@/core/data-access';
import { GoalsStore, RangeStore } from '@/core/state';
import { echarts } from '@/shared/echarts';
import { stubEchartsBrowserApis } from '@/shared/echarts/echarts-jsdom.testing';
import { FutureOverviewComponent } from './future-overview.component';

stubEchartsBrowserApis();

const createFixture = async (): Promise<ComponentFixture<FutureOverviewComponent>> => {
  await TestBed.configureTestingModule({
    imports: [FutureOverviewComponent],
    providers: [
      provideRouter([]),
      provideEchartsCore({ echarts }),
      {
        provide: AppSettingsRepository,
        useValue: { get: vi.fn().mockResolvedValue({ id: 1 }), setPrivacyMode: vi.fn() },
      },
      { provide: GoalsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(FutureOverviewComponent);
  // The goals panel renders a skeleton until its store has hydrated (TICKET-PERF-07).
  await TestBed.inject(GoalsStore).hydrate();
  fixture.detectChanges();
  return fixture;
};

describe('FutureOverviewComponent (TICKET-FUT-03)', () => {
  it('renders the page header titled "Future"', async () => {
    const fixture = await createFixture();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('mm-page-header')?.textContent,
    ).toContain('Future');
  });

  it('renders the standfirst and the no-date-range caption', async () => {
    const fixture = await createFixture();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Plan a purchase against what you actually save');
    expect(host.textContent).toContain('looks forward from today, so it takes no date range');
    expect(host.textContent).toContain('set per section, not per page');
  });

  it('shows no range picker at all — this page has no date range (TICKET-FUT-03)', async () => {
    const fixture = await createFixture();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-range-picker')).toBeNull();
    expect(host.querySelector('mm-date-range-input')).toBeNull();
  });

  it('never touches RangeStore — the page has no range key of its own', async () => {
    await TestBed.configureTestingModule({
      imports: [FutureOverviewComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        {
          provide: AppSettingsRepository,
          useValue: { get: vi.fn().mockResolvedValue({ id: 1 }), setPrivacyMode: vi.fn() },
        },
      ],
    }).compileComponents();
    const rangeStore = TestBed.inject(RangeStore);
    const fromSpy = vi.spyOn(rangeStore, 'from');
    const toSpy = vi.spyOn(rangeStore, 'to');

    const fixture = TestBed.createComponent(FutureOverviewComponent);
    fixture.detectChanges();

    expect(fromSpy).not.toHaveBeenCalled();
    expect(toSpy).not.toHaveBeenCalled();
  });

  it('carries the shared privacy toggle in the header’s end slot — it is an Insights page (TICKET-PRIV-02)', async () => {
    const fixture = await createFixture();
    const header = (fixture.nativeElement as HTMLElement).querySelector(
      'mm-page-header',
    ) as HTMLElement;

    expect(header.querySelector('mm-privacy-toggle')).not.toBeNull();
    expect(
      header
        .querySelector('.mm-page-actions')
        ?.contains(header.querySelector('mm-privacy-toggle')!),
    ).toBe(true);
  });

  it('renders the goals panel as its first section (TICKET-FUT-04)', async () => {
    const fixture = await createFixture();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('app-goals-panel')).not.toBeNull();
    // The section owns its own empty state; the page no longer carries one of its own.
    expect(host.querySelector('app-goals-panel mm-empty-state')).not.toBeNull();
  });
});
