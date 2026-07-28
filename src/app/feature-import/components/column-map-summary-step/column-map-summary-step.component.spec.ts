import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ColumnMapSummaryStepComponent } from './column-map-summary-step.component';
import type { MapperSummaryRow } from '../../column-mapping';

describe('ColumnMapSummaryStepComponent', () => {
  let fixture: ComponentFixture<ColumnMapSummaryStepComponent>;
  let nameControl: FormControl<string>;
  let rememberControl: FormControl<boolean>;

  const rows: MapperSummaryRow[] = [
    { label: 'Date', column: 'Datum', sample: '14/07/2026' },
    { label: 'Description', column: 'Omschrijving' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnMapSummaryStepComponent],
    }).compileComponents();

    nameControl = new FormControl('Custom mapping', { nonNullable: true });
    rememberControl = new FormControl(false, { nonNullable: true });
    fixture = TestBed.createComponent(ColumnMapSummaryStepComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('nameControl', nameControl);
    fixture.componentRef.setInput('rememberControl', rememberControl);
    fixture.detectChanges();
  });

  it('renders the mapping profile name field, bound to nameControl', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector('input[type="text"]');
    expect((input as HTMLInputElement).value).toBe('Custom mapping');
  });

  it('recaps every mapped field with its column and sample', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Date');
    expect(text).toContain('Datum');
    expect(text).toContain('14/07/2026');
    expect(text).toContain('Description');
    expect(text).toContain('Omschrijving');
  });

  it('shows a placeholder when nothing is mapped yet', () => {
    fixture.componentRef.setInput('rows', []);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No columns mapped yet');
  });

  it('renders the remember-mapping checkbox, bound to rememberControl', () => {
    const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'input[type="checkbox"]',
    );
    expect(checkboxes.length).toBe(1);
  });

  it('hides the apply-to-remaining checkbox by default', () => {
    const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'input[type="checkbox"]',
    );
    expect(checkboxes.length).toBe(1); // only "remember this mapping"
  });

  it('shows the apply-to-remaining checkbox once offered, reflecting the remaining count', () => {
    fixture.componentRef.setInput('canOfferApplyToRemaining', true);
    fixture.componentRef.setInput('remainingFilesCount', 3);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Apply this mapping to the remaining 3 files',
    );
  });

  it('emits applyToRemaining when its checkbox is toggled', () => {
    fixture.componentRef.setInput('canOfferApplyToRemaining', true);
    fixture.detectChanges();

    const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'input[type="checkbox"]',
    );
    const applyCheckbox = checkboxes[0] as HTMLInputElement;
    applyCheckbox.checked = true;
    applyCheckbox.dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.applyToRemaining()).toBe(true);
  });
});
