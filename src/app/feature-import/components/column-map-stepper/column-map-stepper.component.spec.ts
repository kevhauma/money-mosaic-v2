import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumnMapStepperComponent } from './column-map-stepper.component';
import type { MapperStepTrackerItem } from '../import-map-step/import-map-step.component';

describe('ColumnMapStepperComponent', () => {
  let fixture: ComponentFixture<ColumnMapStepperComponent>;

  const items: MapperStepTrackerItem[] = [
    { id: 'date', label: 'Date', state: 'done' },
    { id: 'description', label: 'Description', state: 'current' },
    { id: 'amount', label: 'Amount', state: 'upcoming' },
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
});
