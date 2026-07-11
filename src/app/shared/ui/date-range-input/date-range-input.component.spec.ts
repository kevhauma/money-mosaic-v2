import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateRangeInputComponent } from './date-range-input.component';

describe('DateRangeInputComponent', () => {
  let component: DateRangeInputComponent;
  let fixture: ComponentFixture<DateRangeInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateRangeInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DateRangeInputComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', { from: '2026-07-01', to: '2026-07-31' });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a single trigger button showing the formatted from/to label', () => {
    fixture.detectChanges();

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent?.trim()).not.toBe('');
    expect(buttons[0].textContent).not.toContain('Select date range');
  });

  it('shows a placeholder label when no range is set', () => {
    fixture.componentRef.setInput('value', { from: '', to: '' });
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent?.trim()).toBe('Select date range');
  });

  it('renders a single calendar-range popover (not two native date inputs)', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('calendar-range').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('input[type="date"]').length).toBe(0);
  });

  it('passes the value onto the calendar-range value attribute in ISO range format', () => {
    fixture.detectChanges();

    const calendarRange = fixture.nativeElement.querySelector('calendar-range');
    expect(calendarRange.getAttribute('value')).toBe('2026-07-01/2026-07-31');
  });

  it('emits valueChange when the calendar-range change event reports a complete range', () => {
    const emitSpy = vi.fn();
    component.valueChange.subscribe(emitSpy);
    fixture.detectChanges();

    const calendarRange = fixture.nativeElement.querySelector('calendar-range');
    (calendarRange as unknown as { value: string }).value = '2026-06-01/2026-06-15';
    calendarRange.dispatchEvent(new Event('change'));

    expect(emitSpy).toHaveBeenCalledWith({ from: '2026-06-01', to: '2026-06-15' });
  });

  it('does not emit valueChange when the reported value is not yet a complete range', () => {
    const emitSpy = vi.fn();
    component.valueChange.subscribe(emitSpy);
    fixture.detectChanges();

    const calendarRange = fixture.nativeElement.querySelector('calendar-range');
    (calendarRange as unknown as { value: string }).value = '2026-06-01';
    calendarRange.dispatchEvent(new Event('change'));

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('disables the trigger button when disabled is true', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
  });
});
