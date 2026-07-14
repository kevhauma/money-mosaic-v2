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
    });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits customRangeChange with the updated from date', () => {
    const emitSpy = vi.fn();
    component.customRangeChange.subscribe(emitSpy);
    fixture.detectChanges();

    component['onRangeChange']({ from: '2026-06-01', to: '2026-07-31' });

    expect(emitSpy).toHaveBeenCalledWith({ from: '2026-06-01', to: '2026-07-31' });
  });

  it('emits presetChange for a regular preset selection', () => {
    const emitSpy = vi.fn();
    component.presetChange.subscribe(emitSpy);
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'this-year';
    select.dispatchEvent(new Event('change'));

    expect(emitSpy).toHaveBeenCalledWith('this-year');
  });

  it('emits presetChange("custom") when Custom is selected (TICKET-STAT-01 regression guard)', () => {
    const emitSpy = vi.fn();
    component.presetChange.subscribe(emitSpy);
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'custom';
    select.dispatchEvent(new Event('change'));

    expect(emitSpy).toHaveBeenCalledWith('custom');
  });

  it('disables the date-range trigger while a non-custom preset is active', () => {
    fixture.detectChanges();

    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
      'mm-date-range-input button',
    );
    expect(trigger.disabled).toBe(true);
  });

  it('enables the date-range trigger once value().preset is "custom"', () => {
    fixture.componentRef.setInput('value', {
      preset: 'custom',
      from: '2026-07-01',
      to: '2026-07-31',
    });
    fixture.detectChanges();

    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
      'mm-date-range-input button',
    );
    expect(trigger.disabled).toBe(false);
  });

  it('disables the previous/next buttons while "year-to-date" is selected', () => {
    fixture.componentRef.setInput('value', {
      preset: 'year-to-date',
      from: '2026-01-01',
      to: '2026-07-14',
    });
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('mm-button button'),
    );
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it('disables the previous/next buttons while "all-time" is selected', () => {
    fixture.componentRef.setInput('value', {
      preset: 'all-time',
      from: '2015-01-01',
      to: '2026-07-14',
    });
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('mm-button button'),
    );
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it('enables the previous/next buttons for a regular preset', () => {
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('mm-button button'),
    );
    expect(buttons.every((button) => !button.disabled)).toBe(true);
  });

  it('emits rangeShift(-1) when the previous button is clicked', () => {
    const emitSpy = vi.fn();
    component.rangeShift.subscribe(emitSpy);
    fixture.detectChanges();

    const [previousButton]: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('mm-button button'),
    );
    previousButton.click();

    expect(emitSpy).toHaveBeenCalledWith(-1);
  });

  it('emits rangeShift(1) when the next button is clicked', () => {
    const emitSpy = vi.fn();
    component.rangeShift.subscribe(emitSpy);
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('mm-button button'),
    );
    buttons[1].click();

    expect(emitSpy).toHaveBeenCalledWith(1);
  });
});
