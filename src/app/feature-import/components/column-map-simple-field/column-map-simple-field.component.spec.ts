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

    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.disabled).toBe(true);
    expect(button?.textContent?.trim()).toBe('Next');
  });

  it('labels the advance button "Skip" for an empty optional field', () => {
    const control = new FormControl('', { nonNullable: true });
    setup(optionalField, control);

    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(button?.disabled).toBe(false);
    expect(button?.textContent?.trim()).toBe('Skip');
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

    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();

    expect(emitted).toHaveLength(1);
  });
});
