import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { appDb } from '@/core/data-access';
import { echarts } from '@/shared/echarts';
import { DashboardLayoutSettingsStore } from '../../dashboard-layout-settings.store';
import { DashboardOverviewComponent } from './dashboard-overview.component';

// jsdom has no ResizeObserver; the trend chart's echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom has no real canvas 2D context. That's normally harmless for a chart that only ever gets
// change-detected once, but this spec's row-hiding tests await a real (fake-indexeddb) store
// write before a second `detectChanges()`, and that second pass drives the still-mounted trend
// chart's echarts directive into zrender's real paint path, which needs one.
const noopCanvasContext = new Proxy(
  {},
  {
    get: (target: Record<string, unknown>, prop: string) =>
      prop in target ? target[prop] : (): void => {},
    set: (target: Record<string, unknown>, prop: string, value: unknown) => {
      target[prop] = value;
      return true;
    },
  },
);
// jsdom's own `getContext` is defined but always returns null, so `??=` wouldn't replace it.
HTMLCanvasElement.prototype.getContext = (() =>
  noopCanvasContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;

describe('DashboardOverviewComponent', () => {
  let component: DashboardOverviewComponent;
  let fixture: ComponentFixture<DashboardOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent],
      providers: [provideRouter([]), provideEchartsCore({ echarts })],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardOverviewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(async () => {
    // Writes through the real DashboardLayoutSettingsStore/repository to the shared `appDb`
    // (fake-indexeddb is a global singleton and Vitest runs with isolate:false), so leftover rows
    // here leak into other spec files unless cleared.
    await appDb.dashboardLayoutSettings.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it("omits a user-hidden row entirely, composing without error with the row's own zero-count self-hide", async () => {
    // action-queue-panel already self-hides its cards when counts are zero (no data hydrated in
    // this spec); hiding the whole row on top of that must not double-hide or throw (TICKET-STAT-14).
    await TestBed.inject(DashboardLayoutSettingsStore).toggleRowHidden('action-queue');

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('app-action-queue-panel')).toBeNull();
  });

  it('renders a visible row that has no hidden preference', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-action-queue-panel')).not.toBeNull();
  });
});
