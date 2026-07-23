import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { vi } from 'vitest';
import type { ColumnFieldDef } from '../import-map-step/import-map-step.component';
import { ColumnMapCollapsedFieldComponent } from './column-map-collapsed-field.component';

const field: ColumnFieldDef = { key: 'date', label: 'Date', required: true };

describe('ColumnMapCollapsedFieldComponent (TICKET-IMP-07)', () => {
  let fixture: ComponentFixture<ColumnMapCollapsedFieldComponent>;

  const setup = async (
    control: FormControl<string>,
    overrides: { resolvedSample?: string; duplicateWarning?: string } = {},
  ): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ColumnMapCollapsedFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ColumnMapCollapsedFieldComponent);
    fixture.componentRef.setInput('field', field);
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('resolvedSample', overrides.resolvedSample);
    fixture.componentRef.setInput('duplicateWarning', overrides.duplicateWarning);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('shows "Not set" for an empty, untouched field', async () => {
    await setup(new FormControl('', { nonNullable: true, validators: Validators.required }));
    expect(fixture.nativeElement.textContent).toContain('Not set');
  });

  it('shows "Required" for an empty, touched required field', async () => {
    const control = new FormControl('', { nonNullable: true, validators: Validators.required });
    control.markAsTouched();
    await setup(control);
    expect(fixture.nativeElement.textContent).toContain('Required');
  });

  it('shows the chosen column and resolved sample once mapped', async () => {
    await setup(new FormControl('Date', { nonNullable: true }), { resolvedSample: '14/07/2026' });
    expect(fixture.nativeElement.textContent).toContain('Date');
    expect(fixture.nativeElement.textContent).toContain('14/07/2026');
  });

  it('shows the duplicate warning when provided', async () => {
    await setup(new FormControl('Date', { nonNullable: true }), {
      duplicateWarning: 'Also mapped to Description',
    });
    expect(fixture.nativeElement.textContent).toContain('Also mapped to Description');
  });

  it('emits opened when clicked', async () => {
    await setup(new FormControl('', { nonNullable: true }));
    const emitSpy = vi.fn();
    fixture.componentInstance.opened.subscribe(emitSpy);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitSpy).toHaveBeenCalled();
  });
});
