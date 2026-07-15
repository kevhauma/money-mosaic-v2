import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TransactionsRepository } from '@/core/data-access';
import { TransactionsStore } from '@/core/state';

import { ActionQueuePanelComponent } from './action-queue-panel.component';

describe('ActionQueuePanelComponent', () => {
  let fixture: ComponentFixture<ActionQueuePanelComponent>;
  const transactionsRepository = { getAll: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Left permanently pending so TransactionsStore's on-injection hydrate (TICKET-PERF-07) never
    // settles during setup — the "loading skeleton" test below depends on staying in that window;
    // the "renders nothing" test resolves it itself before asserting.
    transactionsRepository.getAll.mockReturnValue(new Promise(() => {}));
    await TestBed.configureTestingModule({
      imports: [ActionQueuePanelComponent],
      providers: [
        provideRouter([]),
        { provide: TransactionsRepository, useValue: transactionsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionQueuePanelComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows a loading skeleton, not an empty state, before TransactionsStore hydrates (TICKET-PERF-05)', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.card')).toBeNull();
  });

  it('renders nothing when both queues are empty (hydrated, not just loading)', async () => {
    transactionsRepository.getAll.mockResolvedValue([]);
    await TestBed.inject(TransactionsStore).hydrate({ force: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.skeleton')).toBeNull();
  });
});
