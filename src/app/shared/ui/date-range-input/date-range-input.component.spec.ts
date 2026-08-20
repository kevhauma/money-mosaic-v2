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

    // `trigger` distinguishes it from the popover's own year-navigation buttons (TICKET-STAT-41).
    const triggers: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('button[trigger]');
    expect(triggers.length).toBe(1);
    expect(triggers[0].textContent?.trim()).not.toBe('');
    expect(triggers[0].textContent).not.toContain('Select date range');
  });

  it('shows a compact "<Month> <year>" label when the range is a full calendar month', () => {
    fixture.componentRef.setInput('value', { from: '2026-07-01', to: '2026-07-31' });
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent?.trim()).toBe('July 2026');
  });

  it('shows a compact "Q<n> <year>" label when the range is a full calendar quarter', () => {
    fixture.componentRef.setInput('value', { from: '2026-07-01', to: '2026-09-30' });
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent?.trim()).toBe('Q3 2026');
  });

  it('shows a compact "W<week> <year>" label when the range is a full ISO week', () => {
    fixture.componentRef.setInput('value', { from: '2026-06-29', to: '2026-07-05' });
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent?.trim()).toBe('W27 2026');
  });

  it('shows a compact "<year>" label when the range is a full calendar year', () => {
    fixture.componentRef.setInput('value', { from: '2026-01-01', to: '2026-12-31' });
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent?.trim()).toBe('2026');
  });

  it('falls back to raw formatted dates for a range matching no calendar boundary', () => {
    fixture.componentRef.setInput('value', { from: '2026-07-05', to: '2026-07-20' });
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    // en-US default (TICKET-SET-04) — MM/DD/YYYY, not the previously-hardcoded en-GB DD/MM/YYYY.
    expect(button.textContent?.trim()).toBe('07/05/2026 – 07/20/2026');
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

  describe('year navigation (TICKET-STAT-41)', () => {
    const calendarRange = (): HTMLElement & { focusedDate?: string } =>
      fixture.nativeElement.querySelector('calendar-range');
    const yearButton = (label: string): HTMLButtonElement =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          `button[aria-label="${label}"]`,
        ) as NodeListOf<HTMLButtonElement>,
      )[0];

    it('renders previous/next year controls with accessible names, distinct from the trigger', () => {
      fixture.detectChanges();

      expect(yearButton('Previous year')).toBeTruthy();
      expect(yearButton('Next year')).toBeTruthy();
    });

    it('clicking "next year" moves the calendar forward by exactly one year from the current value', () => {
      fixture.detectChanges();

      yearButton('Next year').click();
      fixture.detectChanges();

      expect(calendarRange().focusedDate).toBe('2027-07-01');
    });

    it('clicking "previous year" moves the calendar back by exactly one year from the current value', () => {
      fixture.detectChanges();

      yearButton('Previous year').click();
      fixture.detectChanges();

      expect(calendarRange().focusedDate).toBe('2025-07-01');
    });

    it('repeated clicks accumulate from the last navigated position, not from the original value each time', () => {
      fixture.detectChanges();

      yearButton('Next year').click();
      yearButton('Next year').click();
      fixture.detectChanges();

      expect(calendarRange().focusedDate).toBe('2028-07-01');
    });

    it('does not change value or emit valueChange', () => {
      const emitSpy = vi.fn();
      component.valueChange.subscribe(emitSpy);
      fixture.detectChanges();

      yearButton('Next year').click();
      fixture.detectChanges();

      expect(emitSpy).not.toHaveBeenCalled();
      expect(calendarRange().getAttribute('value')).toBe('2026-07-01/2026-07-31');
    });

    it('does not clear or alter an in-progress mid-selection pick', () => {
      fixture.detectChanges();
      // One end picked, the other not yet — Cally reports this as a single date, not a full range.
      (calendarRange() as unknown as { value: string }).value = '2026-08-10';

      yearButton('Previous year').click();
      fixture.detectChanges();

      expect((calendarRange() as unknown as { value: string }).value).toBe('2026-08-10');
    });

    it('falls back to today when no value is set yet', () => {
      fixture.componentRef.setInput('value', { from: '', to: '' });
      fixture.detectChanges();
      const todayIso = new Date().toISOString().slice(0, 10);
      const nextYear = String(Number(todayIso.slice(0, 4)) + 1) + todayIso.slice(4);

      yearButton('Next year').click();
      fixture.detectChanges();

      expect(calendarRange().focusedDate).toBe(nextYear);
    });
  });
});
