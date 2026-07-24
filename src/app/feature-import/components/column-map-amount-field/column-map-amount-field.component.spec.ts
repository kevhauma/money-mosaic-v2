import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ColumnMapAmountFieldComponent } from './column-map-amount-field.component';

describe('ColumnMapAmountFieldComponent', () => {
  let fixture: ComponentFixture<ColumnMapAmountFieldComponent>;
  let amountControl: FormControl<string>;
  let debitControl: FormControl<string>;
  let creditControl: FormControl<string>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnMapAmountFieldComponent],
    }).compileComponents();

    amountControl = new FormControl('', { nonNullable: true });
    debitControl = new FormControl('', { nonNullable: true });
    creditControl = new FormControl('', { nonNullable: true });

    fixture = TestBed.createComponent(ColumnMapAmountFieldComponent);
    fixture.componentRef.setInput('headers', ['Date', 'Debit', 'Credit', 'Amount']);
    fixture.componentRef.setInput('amountControl', amountControl);
    fixture.componentRef.setInput('debitControl', debitControl);
    fixture.componentRef.setInput('creditControl', creditControl);
  });

  it('shows only the single amount select in single-column mode', () => {
    fixture.componentRef.setInput('mode', 'single');
    fixture.detectChanges();

    const selects = (fixture.nativeElement as HTMLElement).querySelectorAll('select');
    expect(selects.length).toBe(1);
  });

  it('shows separate debit and credit selects in split mode', () => {
    fixture.componentRef.setInput('mode', 'split');
    fixture.detectChanges();

    const selects = (fixture.nativeElement as HTMLElement).querySelectorAll('select');
    expect(selects.length).toBe(2);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Debit');
    expect(text).toContain('Credit');
  });

  it('emits modeChange when a toggle button is clicked', () => {
    fixture.componentRef.setInput('mode', 'single');
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.modeChange.subscribe((mode) => emitted.push(mode));

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    const splitButton = Array.from(buttons).find((button) =>
      button.textContent?.includes('Separate debit'),
    );
    splitButton?.dispatchEvent(new Event('click'));

    expect(emitted).toEqual(['split']);
  });

  it('emits advanced when the Next button is clicked', () => {
    fixture.componentRef.setInput('mode', 'single');
    fixture.detectChanges();
    const emitted: void[] = [];
    fixture.componentInstance.advanced.subscribe(() => emitted.push(undefined));

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const nextButton = buttons.find((button) => button.textContent?.trim() === 'Next');
    nextButton?.click();

    expect(emitted).toHaveLength(1);
  });
});
