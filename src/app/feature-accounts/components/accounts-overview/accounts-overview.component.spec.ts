import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { appDb, AccountsRepository } from '@/core/data-access';
import { AccountsStore, TransactionsStore } from '@/core/state';
import type { AccountCardVm } from '../../account-card-vm';

import { AccountsOverviewComponent } from './accounts-overview.component';
import { NetWorthHistoryChartComponent } from '../net-worth-history-chart/net-worth-history-chart.component';

// A light stand-in for the real chart (which pulls in echarts/zrender — jsdom has no real canvas,
// and the VM-focused describe block below drives multiple real `detectChanges()` passes after
// live AccountsStore/TransactionsStore writes, which is exactly the kind of repeated real paint
// cycle that trips up a mounted echarts instance in jsdom). The overview's own control flow is
// what's under test here, not the chart.
@Component({ selector: 'app-net-worth-history-chart', template: '' })
class NetWorthHistoryChartStubComponent {}

describe('AccountsOverviewComponent', () => {
  let fixture: ComponentFixture<AccountsOverviewComponent>;

  const setup = async (providers: unknown[] = []): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [AccountsOverviewComponent],
      providers: [provideRouter([]), ...providers],
    })
      .overrideComponent(AccountsOverviewComponent, {
        remove: { imports: [NetWorthHistoryChartComponent] },
        add: { imports: [NetWorthHistoryChartStubComponent] },
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

      let cards = readCards();
      expect(cards.find((card) => card.account.id === a.id)?.isFirst).toBe(true);
      expect(cards.find((card) => card.account.id === c.id)?.isLast).toBe(true);
      expect(cards.find((card) => card.account.id === b.id)?.isFirst).toBe(false);
      expect(cards.find((card) => card.account.id === b.id)?.isLast).toBe(false);

      await store.moveAccount(a.id!, 'down');
      fixture.detectChanges();

      cards = readCards();
      expect(cards.find((card) => card.account.id === b.id)?.isFirst).toBe(true);
      expect(cards.find((card) => card.account.id === a.id)?.isFirst).toBe(false);
    });
  });
});
