import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import { AccountsRepository } from '@/core/data-access';
import { echarts } from '@/shared/echarts';

import { AccountsOverviewComponent } from './accounts-overview.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

describe('AccountsOverviewComponent', () => {
  let fixture: ComponentFixture<AccountsOverviewComponent>;

  const setup = async (providers: unknown[] = []): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [AccountsOverviewComponent],
      providers: [provideRouter([]), provideEchartsCore({ echarts }), ...providers],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsOverviewComponent);
  };

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
});
