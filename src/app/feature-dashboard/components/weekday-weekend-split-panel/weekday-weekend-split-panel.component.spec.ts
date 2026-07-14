import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RangeStore } from '@/core/stats';
import { TransactionsStore } from '@/core/state';
import { WeekdayWeekendSplitPanelComponent } from './weekday-weekend-split-panel.component';

describe('WeekdayWeekendSplitPanelComponent', () => {
  let fixture: ComponentFixture<WeekdayWeekendSplitPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeekdayWeekendSplitPanelComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(WeekdayWeekendSplitPanelComponent);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders nothing for a range shorter than 2 calendar days', () => {
    TestBed.inject(RangeStore).setCustomRange('2026-07-10', '2026-07-10');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('renders weekday/weekend rates and the ratio for a range spanning a full week', () => {
    // 2026-07-10..18: Fri, Sat, Sun, Mon, Tue, Wed, Thu, Fri, Sat -> 6 weekdays, 3 weekend days.
    TestBed.inject(RangeStore).setCustomRange('2026-07-10', '2026-07-18');
    TestBed.inject(TransactionsStore).addMany([
      {
        id: 1,
        accountId: 1,
        bookingDate: '2026-07-14', // Tue (weekday)
        amount: -60,
        currency: 'EUR',
        rawDescription: 'Groceries',
        fingerprint: 'fp-1',
        createdAt: '2026-07-14T00:00:00.000Z',
      },
      {
        id: 2,
        accountId: 1,
        bookingDate: '2026-07-11', // Sat (weekend)
        amount: -90,
        currency: 'EUR',
        rawDescription: 'Dinner out',
        fingerprint: 'fp-2',
        createdAt: '2026-07-11T00:00:00.000Z',
      },
    ]);

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('€10.00/day'); // 60 / 6 weekdays
    expect(text).toContain('€30.00/day'); // 90 / 3 weekend days
    expect(text).toContain('more per day on weekends');
  });
});
