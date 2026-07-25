import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { ColumnMapSimpleFieldComponent } from './column-map-simple-field.component';
import type { ColumnFieldDef } from '../import-map-step/import-map-step.component';

describe('ColumnMapSimpleFieldComponent', () => {
  let fixture: ComponentFixture<ColumnMapSimpleFieldComponent>;
  const requiredField: ColumnFieldDef = { key: 'date', label: 'Date', required: true };
  const optionalField: ColumnFieldDef = {
    key: 'balance',
    label: 'Running balance',
    required: false,
  };

  const setup = (field: ColumnFieldDef, control: FormControl<string>): void => {
    fixture = TestBed.createComponent(ColumnMapSimpleFieldComponent);
    fixture.componentRef.setInput('field', field);
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('headers', ['Date', 'Desc']);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnMapSimpleFieldComponent],
    }).compileComponents();
  });

  it('shows a required marker and "Required" error once touched-and-invalid', () => {
    const control = new FormControl('', { nonNullable: true, validators: Validators.required });
    setup(requiredField, control);
    control.markAsTouched();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Date *');
    expect(text).toContain('Required');
  });

  it('disables the advance button for a required field left empty', () => {
    const control = new FormControl('', { nonNullable: true, validators: Validators.required });
    setup(requiredField, control);

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    const advanceButton = buttons[1];
    expect(advanceButton?.disabled).toBe(true);
    expect(advanceButton?.textContent?.trim()).toBe('Next');
  });

  it('labels the advance button "Skip" for an empty optional field', () => {
    const control = new FormControl('', { nonNullable: true });
    setup(optionalField, control);

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    const advanceButton = buttons[1];
    expect(advanceButton?.disabled).toBe(false);
    expect(advanceButton?.textContent?.trim()).toBe('Skip');
  });

  it('shows the resolved sample and duplicate warning when provided', () => {
    const control = new FormControl('Date', { nonNullable: true });
    setup(requiredField, control);
    fixture.componentRef.setInput('resolvedSample', '14/07/2026');
    fixture.componentRef.setInput('duplicateWarning', 'Also mapped to Running balance');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('14/07/2026');
    expect(text).toContain('Also mapped to Running balance');
  });

  it('emits advanced when the advance button is clicked', () => {
    const control = new FormControl('Date', { nonNullable: true });
    setup(requiredField, control);
    const emitted: void[] = [];
    fixture.componentInstance.advanced.subscribe(() => emitted.push(undefined));

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[1] as HTMLButtonElement)?.click();

    expect(emitted).toHaveLength(1);
  });

  it('emits return when the Back button is clicked', () => {
    const control = new FormControl('Date', { nonNullable: true });
    setup(requiredField, control);
    const emitted: void[] = [];
    fixture.componentInstance.return.subscribe(() => emitted.push(undefined));

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[0] as HTMLButtonElement)?.click();

    expect(emitted).toHaveLength(1);
  });
});
