import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CyclePickerComponent, type CyclePickerValue } from './cycle-picker.component';

describe('CyclePickerComponent (TICKET-STAT-30)', () => {
  let fixture: ComponentFixture<CyclePickerComponent>;

  const buttons = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CyclePickerComponent] }).compileComponents();

    fixture = TestBed.createComponent(CyclePickerComponent);
    fixture.componentRef.setInput('value', 'day-of-week' satisfies CyclePickerValue);
    fixture.detectChanges();
  });

  it('offers one button per cycle, labelled in plain language', () => {
    expect(buttons().map((button) => button.textContent?.trim())).toEqual([
      'Day of week',
      'Day of month',
      'Month',
      'Quarter',
    ]);
  });

  it('marks the active cycle for sighted and assistive users alike', () => {
    expect(buttons()[0].classList).toContain('btn-active');
    expect(buttons()[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons()[2].getAttribute('aria-pressed')).toBe('false');
  });

  it('names the group so the buttons are not four unexplained words to a screen reader', () => {
    const group = fixture.nativeElement.querySelector('[role="group"]') as HTMLElement;

    expect(group.getAttribute('aria-label')).toBe('Calendar cycle');
  });

  it('renders only the cycles the caller says are available (TICKET-STAT-31)', () => {
    fixture.componentRef.setInput('available', ['day-of-week', 'day-of-month']);
    fixture.detectChanges();

    expect(buttons().map((button) => button.textContent?.trim())).toEqual([
      'Day of week',
      'Day of month',
    ]);
  });

  it('emits the clicked cycle without changing its own state — the caller owns the value', () => {
    const emitted: CyclePickerValue[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

    buttons()[3].click();
    fixture.detectChanges();

    expect(emitted).toEqual(['quarter-of-year']);
    expect(buttons()[0].classList).toContain('btn-active'); // still what the input says
  });
});
