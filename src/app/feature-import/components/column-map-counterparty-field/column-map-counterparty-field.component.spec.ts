import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ColumnMapCounterpartyFieldComponent } from './column-map-counterparty-field.component';

describe('ColumnMapCounterpartyFieldComponent', () => {
  let fixture: ComponentFixture<ColumnMapCounterpartyFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnMapCounterpartyFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ColumnMapCounterpartyFieldComponent);
    fixture.componentRef.setInput('headers', ['Name', 'IBAN']);
    fixture.componentRef.setInput('nameControl', new FormControl('', { nonNullable: true }));
    fixture.componentRef.setInput('ibanControl', new FormControl('', { nonNullable: true }));
    fixture.detectChanges();
  });

  it('renders both the name and IBAN selects together', () => {
    const selects = (fixture.nativeElement as HTMLElement).querySelectorAll('select');
    expect(selects.length).toBe(2);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Counterparty name');
    expect(text).toContain('Counterparty IBAN');
  });

  it('shows each field’s resolved sample and duplicate warning independently', () => {
    fixture.componentRef.setInput('nameSample', 'ACME Corp');
    fixture.componentRef.setInput('ibanWarning', 'Also mapped to Own account number/IBAN');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('ACME Corp');
    expect(text).toContain('Also mapped to Own account number/IBAN');
  });

  it('emits advanced when the Next button is clicked', () => {
    const emitted: void[] = [];
    fixture.componentInstance.advanced.subscribe(() => emitted.push(undefined));

    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();

    expect(emitted).toHaveLength(1);
  });
});
