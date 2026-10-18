import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import { AccountsRepository, type Account } from '@/core/data-access';
import { ServerUnreachableError } from '@/core/server-status';
import { AccountsStore } from '@/core/state';
import { echarts } from '@/shared/echarts';

import { AccountsDetailComponent } from './accounts-detail.component';
import { AccountInsightsComponent } from '../account-insights/account-insights.component';
import { provideFakeApi } from '@/core/data-access/fake-api.testing';

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
      providers: [...provideFakeApi(), provideRouter([]), provideEchartsCore({ echarts })],
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

  afterEach(async () => {});
});

describe('AccountsDetailComponent against a server that is slow or down (TICKET-ACC-15)', () => {
  const checking: Account = {
    id: 1,
    name: 'Everyday Checking',
    type: 'checking',
    currency: 'EUR',
    openingBalance: 0,
    openingBalanceDate: '2026-01-01',
    color: '#7F77DD',
    icon: 'wallet',
    archived: false,
  };
  const accountsRepository = { getAll: vi.fn() };
  // Shared across tests under `isolate: false`: no queued answer or call history may leak.
  beforeEach(() => {
    accountsRepository.getAll.mockReset();
  });

  /** Mounts `/accounts/:id` with `AccountsStore`'s read answering however the test says. */
  const mount = async (id: string): Promise<ComponentFixture<AccountsDetailComponent>> => {
    await TestBed.configureTestingModule({
      imports: [AccountsDetailComponent],
      providers: [
        ...provideFakeApi(),
        provideRouter([]),
        provideEchartsCore({ echarts }),
        { provide: AccountsRepository, useValue: accountsRepository },
      ],
    })
      .overrideComponent(AccountsDetailComponent, {
        remove: { imports: [AccountInsightsComponent] },
        add: { imports: [AccountInsightsStubComponent] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(AccountsDetailComponent);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    return fixture;
  };

  const text = (fixture: ComponentFixture<AccountsDetailComponent>): string =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('shows a skeleton, not "Account not found", while accounts are still loading', async () => {
    accountsRepository.getAll.mockReturnValue(new Promise<Account[]>(() => undefined));
    const fixture = await mount('1');
    const page = fixture.nativeElement as HTMLElement;

    expect(TestBed.inject(AccountsStore).loading()).toBe(true);
    expect(page.querySelector('mm-hydration-boundary > mm-loading-skeleton')).not.toBeNull();
    expect(text(fixture)).not.toContain('Account not found');
    expect(page.querySelector('mm-page-header')).toBeNull();
  });

  it('reports a failed read with Try again instead of "Account not found", and Try again recovers the page', async () => {
    // Every read fails until the server "comes back" just before Try again — so a page that
    // recovered without the click would have nothing to recover with.
    accountsRepository.getAll.mockRejectedValue(new ServerUnreachableError());
    const fixture = await mount('1');
    const store = TestBed.inject(AccountsStore);
    await store.hydrate().catch(() => undefined);
    fixture.detectChanges();

    expect(text(fixture)).toContain('Cannot reach the server. Is it running?');
    expect(text(fixture)).not.toContain('Account not found');

    const tryAgain = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((button) => button.textContent?.trim() === 'Try again');
    accountsRepository.getAll.mockResolvedValue([checking]);
    expect(tryAgain).toBeDefined();
    tryAgain!.click();
    // The click itself started the re-read; awaiting `hydrate()` now joins it rather than starting one.
    expect(store.loading()).toBe(true);
    expect(accountsRepository.getAll).toHaveBeenCalledTimes(2);
    await store.hydrate();
    fixture.detectChanges();

    expect(text(fixture)).not.toContain('Cannot reach the server');
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('mm-page-header h1')
        ?.textContent?.trim(),
    ).toBe('Everyday Checking');
  });

  it('still says "Account not found" once accounts have loaded and none has this id', async () => {
    accountsRepository.getAll.mockResolvedValue([checking]);
    const fixture = await mount('999');
    await TestBed.inject(AccountsStore).hydrate();
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(text(fixture)).toContain('Account not found');
    expect(page.querySelector('mm-empty-state a')?.getAttribute('href')).toBe('/accounts');
  });
});
