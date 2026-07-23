import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { vi } from 'vitest';
import type { ColumnFieldDef } from '../import-map-step/import-map-step.component';
import { ColumnMapFieldComponent } from './column-map-field.component';

const requiredField: ColumnFieldDef = { key: 'date', label: 'Date', required: true };
const optionalField: ColumnFieldDef = { key: 'balance', label: 'Running balance', required: false };

describe('ColumnMapFieldComponent (TICKET-IMP-07)', () => {
  let fixture: ComponentFixture<ColumnMapFieldComponent>;

  const setup = async (overrides: {
    field?: ColumnFieldDef;
    control?: FormControl<string>;
    active?: boolean;
    isLast?: boolean;
    resolvedSample?: string;
    duplicateWarning?: string;
  }): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ColumnMapFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ColumnMapFieldComponent);
    fixture.componentRef.setInput('field', overrides.field ?? requiredField);
    fixture.componentRef.setInput(
      'control',
      overrides.control ??
        new FormControl('', { nonNullable: true, validators: Validators.required }),
    );
    fixture.componentRef.setInput('headers', ['Date', 'Desc']);
    fixture.componentRef.setInput('active', overrides.active ?? true);
    fixture.componentRef.setInput('isLast', overrides.isLast ?? false);
    fixture.componentRef.setInput('resolvedSample', overrides.resolvedSample);
    fixture.componentRef.setInput('duplicateWarning', overrides.duplicateWarning);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('renders the field select when active', async () => {
    await setup({ active: true });

    expect(fixture.nativeElement.querySelector('select')).toBeTruthy();
  });

  it('renders a collapsed clickable summary row when not active', async () => {
    await setup({ active: false });

    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
  });

  it('emits opened when the collapsed row is clicked', async () => {
    await setup({ active: false });
    const emitSpy = vi.fn();
    fixture.componentInstance.opened.subscribe(emitSpy);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('disables the advance button on a required field left empty', async () => {
    await setup({ field: requiredField, active: true });

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('enables the advance button once a required field is filled', async () => {
    const control = new FormControl('Date', {
      nonNullable: true,
      validators: Validators.required,
    });
    await setup({ field: requiredField, control, active: true });

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent?.trim()).toBe('Next');
  });

  it('never disables the advance button on an empty optional field, and labels it "Skip"', async () => {
    await setup({ field: optionalField, active: true });

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent?.trim()).toBe('Skip');
  });

  it('labels the last field\'s advance button "Done"', async () => {
    await setup({ field: optionalField, active: true, isLast: true });

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Done');
  });

  it('emits advanced when the advance action fires', async () => {
    const control = new FormControl('Date', { nonNullable: true });
    await setup({ field: optionalField, control, active: true });
    const emitSpy = vi.fn();
    fixture.componentInstance.advanced.subscribe(emitSpy);

    fixture.componentInstance.advanced.emit();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('shows the resolved sample when provided', async () => {
    await setup({ active: true, resolvedSample: '14/07/2026' });

    expect(fixture.nativeElement.textContent).toContain('14/07/2026');
  });

  it('shows the duplicate warning when provided', async () => {
    await setup({ active: true, duplicateWarning: 'Also mapped to Description' });

    expect(fixture.nativeElement.textContent).toContain('Also mapped to Description');
  });

  it('shows a required error once the control is invalid and touched', async () => {
    const control = new FormControl('', { nonNullable: true, validators: Validators.required });
    control.markAsTouched();
    await setup({ field: requiredField, control, active: true });

    expect(fixture.nativeElement.textContent).toContain('Required — pick a column for Date.');
  });
});
