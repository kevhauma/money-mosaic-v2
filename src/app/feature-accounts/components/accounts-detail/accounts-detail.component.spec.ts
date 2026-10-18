import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { appDb, type Account } from '@/core/data-access';
import { AccountsStore } from '@/core/state';
import { echarts } from '@/shared/echarts';

import { AccountsDetailComponent } from './accounts-detail.component';
import { AccountInsightsComponent } from '../account-insights/account-insights.component';

// Stands in for the insight section (TICKET-ACC-14), whose charts pull in echarts/zrender — jsdom has
// no canvas 2D context, and the header test below seeds a real account, which is exactly what mounts
// the section for real. It has its own spec.
@Component({ selector: 'app-account-insights', template: '' })
class AccountInsightsStubComponent {
  readonly account = input<Account>();
}

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

describe('AccountsDetailComponent', () => {
  let component: AccountsDetailComponent;
  let fixture: ComponentFixture<AccountsDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountsDetailComponent],
      providers: [provideRouter([]), provideEchartsCore({ echarts })],
    })
      .overrideComponent(AccountsDetailComponent, {
        remove: { imports: [AccountInsightsComponent] },
        add: { imports: [AccountInsightsStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountsDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders no subtitle, and its own range control beside the title (TICKET-UI-22, TICKET-ACC-08, TICKET-ACC-14)', async () => {
    const store = TestBed.inject(AccountsStore);
    await store.addAccount({
      name: 'Everyday Checking',
      type: 'checking',
      currency: 'EUR',
      openingBalance: 0,
      openingBalanceDate: '2026-01-01',
      color: '#7F77DD',
      icon: 'wallet',
      archived: false,
    });
    fixture.componentRef.setInput('id', String(store.accounts()[0].id));
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;

    expect(page.querySelector('mm-page-header h1')?.textContent?.trim()).toBe('Everyday Checking');
    // The account type used to be the header's subtitle; it reads off the balance block now.
    expect(page.querySelector('mm-page-header .mm-page-title p')).toBeNull();
    // The page owns a range since TICKET-ACC-14 (it had none under TICKET-UI-23), projected into the
    // scope-control slot next to "Back to accounts".
    expect(page.querySelector('mm-page-header mm-range-picker[actions-start]')).not.toBeNull();
    expect(page.querySelector('app-account-insights')).not.toBeNull();
  });

  afterEach(async () => {
    // Real AccountsStore writes land in the shared fake-indexeddb `appDb` (Vitest isolate:false).
    await appDb.accounts.clear();
  });
});
