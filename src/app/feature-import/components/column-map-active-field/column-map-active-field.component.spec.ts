import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { vi } from 'vitest';
import type { ColumnFieldDef } from '../import-map-step/import-map-step.component';
import { ColumnMapActiveFieldComponent } from './column-map-active-field.component';

const requiredField: ColumnFieldDef = { key: 'date', label: 'Date', required: true };
const optionalField: ColumnFieldDef = { key: 'balance', label: 'Running balance', required: false };

describe('ColumnMapActiveFieldComponent (TICKET-IMP-07)', () => {
  let fixture: ComponentFixture<ColumnMapActiveFieldComponent>;

  const setup = async (overrides: {
    field?: ColumnFieldDef;
    control?: FormControl<string>;
    isLast?: boolean;
    resolvedSample?: string;
    duplicateWarning?: string;
  }): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ColumnMapActiveFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ColumnMapActiveFieldComponent);
    fixture.componentRef.setInput('field', overrides.field ?? requiredField);
    fixture.componentRef.setInput(
      'control',
      overrides.control ??
        new FormControl('', { nonNullable: true, validators: Validators.required }),
    );
    fixture.componentRef.setInput('headers', ['Date', 'Desc']);
    fixture.componentRef.setInput('isLast', overrides.isLast ?? false);
    fixture.componentRef.setInput('resolvedSample', overrides.resolvedSample);
    fixture.componentRef.setInput('duplicateWarning', overrides.duplicateWarning);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('renders the column select', async () => {
    await setup({});
    expect(fixture.nativeElement.querySelector('select')).toBeTruthy();
  });

  it('disables the advance button on a required field left empty, labelled "Next" (not "Skip") since it cannot be skipped', async () => {
    await setup({ field: requiredField });
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('Next');
  });

  it('enables the advance button once the required field is filled, labelled "Next"', async () => {
    const control = new FormControl('Date', {
      nonNullable: true,
      validators: Validators.required,
    });
    await setup({ field: requiredField, control });
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent?.trim()).toBe('Next');
  });

  it('never disables the advance button on an empty optional field, labelled "Skip"', async () => {
    await setup({ field: optionalField });
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent?.trim()).toBe('Skip');
  });

  it('labels the last field\'s advance button "Done"', async () => {
    await setup({ field: optionalField, isLast: true });
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Done');
  });

  it('emits advanced when the advance button is clicked', async () => {
    const control = new FormControl('Date', { nonNullable: true });
    await setup({ field: optionalField, control });
    const emitSpy = vi.fn();
    fixture.componentInstance.advanced.subscribe(emitSpy);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('shows the resolved sample when provided', async () => {
    await setup({ resolvedSample: '14/07/2026' });
    expect(fixture.nativeElement.textContent).toContain('14/07/2026');
  });

  it('shows the duplicate warning when provided', async () => {
    await setup({ duplicateWarning: 'Also mapped to Description' });
    expect(fixture.nativeElement.textContent).toContain('Also mapped to Description');
  });

  it('shows a required error once the control is invalid and touched', async () => {
    const control = new FormControl('', { nonNullable: true, validators: Validators.required });
    control.markAsTouched();
    await setup({ field: requiredField, control });

    expect(fixture.nativeElement.textContent).toContain('Required — pick a column for Date.');
  });
});
