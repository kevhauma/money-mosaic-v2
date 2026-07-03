import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RangeGroupingSwitcherComponent } from './range-grouping-switcher.component';

describe('RangeGroupingSwitcherComponent', () => {
  let component: RangeGroupingSwitcherComponent;
  let fixture: ComponentFixture<RangeGroupingSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RangeGroupingSwitcherComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RangeGroupingSwitcherComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', {
      preset: 'this-month',
      from: '2026-07-01',
      to: '2026-07-31',
      groupBy: 'month',
    });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits groupByChange when a granularity button is clicked', () => {
    const emitSpy = vi.fn();
    component.groupByChange.subscribe(emitSpy);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.join button');
    const dayButton = [...buttons].find((button) => button.textContent.trim() === 'Day');
    dayButton.click();

    expect(emitSpy).toHaveBeenCalledWith('day');
  });

  it('emits customRangeChange with the updated from date', () => {
    const emitSpy = vi.fn();
    component.customRangeChange.subscribe(emitSpy);
    fixture.detectChanges();

    component['onFromChange']('2026-06-01');

    expect(emitSpy).toHaveBeenCalledWith({ from: '2026-06-01', to: '2026-07-31' });
  });
});
