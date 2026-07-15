import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TransactionsStore } from '@/core/state';

import { ActionQueuePanelComponent } from './action-queue-panel.component';

describe('ActionQueuePanelComponent', () => {
  let fixture: ComponentFixture<ActionQueuePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionQueuePanelComponent],
      providers: [provideRouter([])],
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
    await TestBed.inject(TransactionsStore).hydrate();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.skeleton')).toBeNull();
  });
});
