import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IncomeOverviewComponent } from './income-overview.component';

describe('IncomeOverviewComponent', () => {
  let fixture: ComponentFixture<IncomeOverviewComponent>;

  const setup = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [IncomeOverviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeOverviewComponent);
  };

  it('should create', async () => {
    await setup();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the Income page header and the placeholder empty state (TICKET-INC-01 is shell-only)', async () => {
    await setup();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Income');
    expect(fixture.nativeElement.querySelector('mm-empty-state')).not.toBeNull();
  });
});
