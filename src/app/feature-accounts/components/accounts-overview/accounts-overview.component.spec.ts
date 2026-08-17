import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { appDb, AccountsRepository } from '@/core/data-access';
import { AccountsStore, TransactionsStore } from '@/core/state';
import type { AccountCardVm } from '../../account-card-vm';

import { AccountsOverviewComponent } from './accounts-overview.component';
import { AccountBalanceHistoryChartComponent } from '../account-balance-history-chart/account-balance-history-chart.component';

// A light stand-in for the real chart (which pulls in echarts/zrender — jsdom has no real canvas,
// and the VM-focused describe block below drives multiple real `detectChanges()` passes after
// live AccountsStore/TransactionsStore writes, which is exactly the kind of repeated real paint
// cycle that trips up a mounted echarts instance in jsdom). The overview's own control flow is
// what's under test here, not the chart.
@Component({ selector: 'app-account-balance-history-chart', template: '' })
class AccountBalanceHistoryChartStubComponent {}

describe('AccountsOverviewComponent', () => {
  let fixture: ComponentFixture<AccountsOverviewComponent>;

  const setup = async (providers: unknown[] = []): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [AccountsOverviewComponent],
      providers: [provideRouter([]), ...providers],
    })
      .overrideComponent(AccountsOverviewComponent, {
        remove: { imports: [AccountBalanceHistoryChartComponent] },
        add: { imports: [AccountBalanceHistoryChartStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountsOverviewComponent);
  };

  afterEach(async () => {
    // The VM-focused describe block below writes through the real AccountsStore/TransactionsStore
    // to the shared `appDb` (fake-indexeddb is a global singleton and Vitest runs with
    // isolate:false), so leftover rows here leak into other spec files unless cleared.
    await appDb.accounts.clear();
    await appDb.transactions.clear();
  });

  it('should create', async () => {
    await setup();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows a loading skeleton, not the "no accounts yet" empty state, before AccountsStore hydrates (TICKET-PERF-07)', async () => {
    const accountsRepository = { getAll: vi.fn().mockReturnValue(new Promise(() => {})) };
    await setup([{ provide: AccountsRepository, useValue: accountsRepository }]);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No accounts yet');
  });

  describe('page header (TICKET-ACC-08)', () => {
    const headerControls = (): string[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          'mm-page-header input[type="checkbox"], mm-page-header mm-range-picker, mm-page-header button',
        ) as NodeListOf<HTMLElement>,
      )
        // The picker brings its own prev/next buttons; only the header's own controls count.
        .filter((el) => el.tagName !== 'BUTTON' || !el.closest('mm-range-picker'))
        .map((el) =>
          el.tagName === 'BUTTON' ? `button[${el.textContent?.trim()}]` : el.tagName.toLowerCase(),
        );

    it('renders exactly three controls, in the order range · show-archived · add account (TICKET-UI-24)', async () => {
      await setup();
      fixture.detectChanges();

      expect(headerControls()).toEqual(['mm-range-picker', 'input', 'button[Add account]']);
    });

    it('puts the range in the start group beside the title and the two actions in the end group (TICKET-UI-24)', async () => {
      await setup();
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('mm-page-header') as HTMLElement;
      const startGroup = header.querySelector('.mm-page-actions-start');
      const endGroup = header.querySelector('.mm-page-actions');

      const range = header.querySelector('mm-range-picker');
      const toggle = header.querySelector('input[type="checkbox"]');
      const addButton = Array.from(header.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Add account',
      );

      expect(startGroup?.contains(range as Node)).toBe(true);
      expect(startGroup?.querySelector('h1')?.textContent?.trim()).toBe('Accounts');
      expect(endGroup?.contains(range as Node)).toBe(false);
      expect(endGroup?.contains(toggle as Node)).toBe(true);
      expect(endGroup?.contains(addButton as Node)).toBe(true);
    });

    it('leaves no page-level control in the body', async () => {
      await setup();
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;
      const header = page.querySelector('mm-page-header');

      const strays = Array.from(
        page.querySelectorAll('mm-range-picker') as NodeListOf<HTMLElement>,
      ).filter((el) => !header?.contains(el));

      expect(strays).toEqual([]);
      expect(page.querySelector('mm-page-header .mm-page-title p')).toBeNull();
    });

    it('"Show archived" reveals archived accounts in the list while the chart keeps plotting only active ones', async () => {
      await setup();
      const store = TestBed.inject(AccountsStore);
      const active = await store.addAccount({
        name: 'Active',
        type: 'checking',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#7F77DD',
        icon: 'wallet',
        archived: false,
      });
      const archived = await store.addAccount({
        name: 'Archived',
        type: 'checking',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#7F77DD',
        icon: 'wallet',
        archived: false,
      });
      await store.archiveAccount(archived.id!);
      fixture.detectChanges();

      const visibleNames = (): string[] =>
        (
          fixture.componentInstance as unknown as { visibleAccounts: () => { name: string }[] }
        ).visibleAccounts
          .call(fixture.componentInstance)
          ?.map((a) => a.name) ?? [];

      expect(visibleNames()).toEqual(['Active']);

      const toggle = fixture.nativeElement.querySelector(
        'mm-page-header input[type="checkbox"]',
      ) as HTMLInputElement;
      toggle.click();
      fixture.detectChanges();

      expect(visibleNames()).toEqual(['Active', 'Archived']);
      // The chart's own scope is unchanged — it plots activeAccounts() by design (TICKET-ACC-07).
      expect(store.activeAccounts().map((a) => a.name)).toEqual(['Active']);
      expect(active.id).toBeDefined();
    });

    it('keeps the action row wrapping so three controls degrade rather than overflow at 375px', async () => {
      await setup();
      fixture.detectChanges();

      const actions = fixture.nativeElement.querySelector('div.mm-page-actions') as HTMLElement;
      expect(actions.classList.contains('flex-wrap')).toBe(true);
    });
  });

  describe('accountCards VM (TICKET-ACC-05)', () => {
    const readCards = (): AccountCardVm[] =>
      (
        fixture.componentInstance as unknown as { accountCards: () => AccountCardVm[] }
      ).accountCards();

    it('joins each account with its running balance (opening balance + transactions)', async () => {
      await setup();
      const created = await TestBed.inject(AccountsStore).addAccount({
        name: 'Checking',
        type: 'checking',
        currency: 'EUR',
        openingBalance: 100,
        openingBalanceDate: '2026-01-01',
        color: '#7F77DD',
        icon: 'wallet',
        archived: false,
      });
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: created.id!,
          bookingDate: '2026-07-01',
          amount: -30,
          currency: 'EUR',
          rawDescription: 'Coffee',
          fingerprint: 'fp-1',
          createdAt: '2026-07-01T00:00:00.000Z',
        },
      ]);
      fixture.detectChanges();

      expect(readCards()[0].balance).toBe(70);
    });

    it('marks a joint account with hasShare true and a non-joint account with hasShare false', async () => {
      await setup();
      await TestBed.inject(AccountsStore).addAccount({
        name: 'Shared',
        type: 'joint',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#7F77DD',
        icon: 'users',
        archived: false,
      });
      await TestBed.inject(AccountsStore).addAccount({
        name: 'Solo',
        type: 'checking',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#7F77DD',
        icon: 'wallet',
        archived: false,
      });
      fixture.detectChanges();

      const cards = readCards();
      expect(cards.find((c) => c.account.name === 'Shared')?.hasShare).toBe(true);
      expect(cards.find((c) => c.account.name === 'Solo')?.hasShare).toBe(false);
    });

    it('resolves the icon name from the stored icon key', async () => {
      await setup();
      await TestBed.inject(AccountsStore).addAccount({
        name: 'Piggy',
        type: 'savings',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#7F77DD',
        icon: 'piggy-bank',
        archived: false,
      });
      fixture.detectChanges();

      expect(readCards()[0].iconName).toBe('accountPiggyBank');
    });

    it('flags only the first and last account, and reflects a reorder', async () => {
      await setup();
      const store = TestBed.inject(AccountsStore);
      const a = await store.addAccount({
        name: 'A',
        type: 'checking',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#7F77DD',
        icon: 'wallet',
        archived: false,
      });
      const b = await store.addAccount({
        name: 'B',
        type: 'checking',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#7F77DD',
        icon: 'wallet',
        archived: false,
      });
      const c = await store.addAccount({
        name: 'C',
        type: 'checking',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#7F77DD',
        icon: 'wallet',
        archived: false,
      });
      fixture.detectChanges();

      // Flags follow the *rendered* order, which is the chart's band order — the reverse of the
      // store order (TICKET-ACC-09). C was added last, so its band is on top and its card first.
      let cards = readCards();
      expect(cards.find((card) => card.account.id === c.id)?.isFirst).toBe(true);
      expect(cards.find((card) => card.account.id === a.id)?.isLast).toBe(true);
      expect(cards.find((card) => card.account.id === b.id)?.isFirst).toBe(false);
      expect(cards.find((card) => card.account.id === b.id)?.isLast).toBe(false);

      await store.moveAccount(c.id!, 'up');
      fixture.detectChanges();

      cards = readCards();
      expect(cards.find((card) => card.account.id === b.id)?.isFirst).toBe(true);
      expect(cards.find((card) => card.account.id === c.id)?.isFirst).toBe(false);
    });
  });

  describe('one column in the chart’s band order (TICKET-ACC-09)', () => {
    const readCards = (): AccountCardVm[] =>
      (
        fixture.componentInstance as unknown as { accountCards: () => AccountCardVm[] }
      ).accountCards();

    const addAccount = (name: string, archived = false) =>
      TestBed.inject(AccountsStore).addAccount({
        name,
        type: 'checking',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#7F77DD',
        icon: 'wallet',
        archived,
      });

    it('renders one column at every breakpoint', async () => {
      await setup();
      await addAccount('Checking');
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('div.grid') as HTMLElement;

      expect(container.className).toContain('grid-cols-1');
      // A grid can only match a stack order by reading order, which nobody does across columns.
      expect(container.className).not.toContain('sm:grid-cols-2');
      expect(container.className).not.toContain('lg:grid-cols-3');
    });

    it('puts the topmost band’s account in the first card, i.e. the reverse of the chart’s series order', async () => {
      await setup();
      const store = TestBed.inject(AccountsStore);
      await addAccount('Checking');
      await addAccount('Savings');
      await addAccount('Credit line');
      fixture.detectChanges();

      // What the chart builder is handed, in series order — series[0] is the *bottom* band.
      const seriesOrder = store.activeAccounts().map((a) => a.name);
      const rendered = readCards().map((card) => card.account.name);

      expect(seriesOrder).toEqual(['Checking', 'Savings', 'Credit line']);
      expect(rendered).toEqual([...seriesOrder].reverse());
    });

    it('moves with the chart: a reorder shifts the series order and the card order together', async () => {
      await setup();
      const store = TestBed.inject(AccountsStore);
      await addAccount('Checking');
      const savings = await addAccount('Savings');
      await addAccount('Credit line');
      fixture.detectChanges();

      // Both sides read `activeAccounts()`, so neither can be reordered without the other.
      await store.moveAccount(savings.id!, 'down');
      fixture.detectChanges();

      expect(store.activeAccounts().map((a) => a.name)).toEqual([
        'Checking',
        'Credit line',
        'Savings',
      ]);
      expect(readCards().map((card) => card.account.name)).toEqual([
        'Savings',
        'Credit line',
        'Checking',
      ]);
    });

    it('a card’s "up" arrow raises its band as well as its card', async () => {
      await setup();
      const store = TestBed.inject(AccountsStore);
      await addAccount('Checking');
      const savings = await addAccount('Savings');
      await addAccount('Credit line');
      fixture.detectChanges();
      const component = fixture.componentInstance as unknown as {
        moveAccount: (account: { id?: number }, direction: 'up' | 'down') => void;
      };

      // Savings renders in the middle. A visual "up" must reach the store as "down": the rendered
      // list is the reverse of the store order, so passing 'up' through unchanged would move the
      // card up and its band down — the exact mismatch this ticket removes.
      const moveAccount = vi.spyOn(store, 'moveAccount').mockResolvedValue(undefined);
      component.moveAccount(savings, 'up');
      expect(moveAccount).toHaveBeenCalledExactlyOnceWith(savings.id, 'down');
      moveAccount.mockRestore();

      // And that is indeed the direction that raises both the card and the band.
      await store.moveAccount(savings.id!, 'down');
      fixture.detectChanges();

      expect(readCards().map((card) => card.account.name)).toEqual([
        'Savings',
        'Credit line',
        'Checking',
      ]);
      expect(store.activeAccounts().map((a) => a.name)).toEqual([
        'Checking',
        'Credit line',
        'Savings',
      ]);
    });

    it('renders archived accounts after every active one when the toggle is on', async () => {
      await setup();
      await addAccount('Checking');
      await addAccount('Savings');
      await addAccount('Old joint', true);
      const component = fixture.componentInstance as unknown as {
        showArchived: { set: (value: boolean) => void };
      };
      component.showArchived.set(true);
      fixture.detectChanges();

      const rendered = readCards();

      expect(rendered.map((card) => card.account.name)).toEqual([
        'Savings',
        'Checking',
        'Old joint',
      ]);
      // No band to align with, so the archived block breaks cleanly at the bottom.
      expect(rendered.at(-1)?.account.archived).toBe(true);
      expect(rendered.at(-1)?.isLast).toBe(true);
      expect(rendered[0].isFirst).toBe(true);
    });
  });
});
