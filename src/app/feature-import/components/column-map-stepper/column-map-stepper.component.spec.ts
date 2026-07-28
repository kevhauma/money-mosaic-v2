import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumnMapStepperComponent } from './column-map-stepper.component';
import type { MapperStepTrackerItem } from '../../mapper-steps';

describe('ColumnMapStepperComponent', () => {
  let fixture: ComponentFixture<ColumnMapStepperComponent>;

  const items: MapperStepTrackerItem[] = [
    { id: 'date', label: 'Date', state: 'done', status: 'complete' },
    { id: 'description', label: 'Description', state: 'current', status: 'incomplete' },
    { id: 'amount', label: 'Amount', state: 'upcoming', status: 'empty' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnMapStepperComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ColumnMapStepperComponent);
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
  });

  it('renders every step label', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Date');
    expect(text).toContain('Description');
    expect(text).toContain('Amount');
  });

  it('renders every step as a clickable button, including an upcoming one', () => {
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(buttons.length).toBe(3);
  });

  it('emits stepClicked with the id of any clicked step, including an upcoming one', () => {
    const emitted: string[] = [];
    fixture.componentInstance.stepClicked.subscribe((id) => emitted.push(id));

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[2] as HTMLButtonElement).click(); // "Amount" — the upcoming step

    expect(emitted).toEqual(['amount']);
  });

  it('shows a checkmark for a complete step and a warning mark for an incomplete one', () => {
    const steps = (fixture.nativeElement as HTMLElement).querySelectorAll('li.step');
    expect(steps[0].getAttribute('data-content')).toBe('✓'); // date: complete
    expect(steps[1].getAttribute('data-content')).toBe('!'); // description: incomplete
    expect(steps[2].getAttribute('data-content')).toBeNull(); // amount: empty
  });

  it('flags an incomplete step as an error even though it is the current step', () => {
    const steps = (fixture.nativeElement as HTMLElement).querySelectorAll('li.step');
    expect(steps[1].classList.contains('step-error')).toBe(true);
    expect(steps[1].classList.contains('step-primary')).toBe(false);
  });
});
