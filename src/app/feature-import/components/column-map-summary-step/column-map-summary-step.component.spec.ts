import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ColumnMapSummaryStepComponent } from './column-map-summary-step.component';
import type { MapperSummaryRow } from './column-map-summary-step.component';

describe('ColumnMapSummaryStepComponent', () => {
  let fixture: ComponentFixture<ColumnMapSummaryStepComponent>;
  let rememberControl: FormControl<boolean>;

  const rows: MapperSummaryRow[] = [
    { label: 'Date', column: 'Datum', sample: '14/07/2026' },
    { label: 'Description', column: 'Omschrijving' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnMapSummaryStepComponent],
    }).compileComponents();

    rememberControl = new FormControl(false, { nonNullable: true });
    fixture = TestBed.createComponent(ColumnMapSummaryStepComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('rememberControl', rememberControl);
    fixture.detectChanges();
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
});
