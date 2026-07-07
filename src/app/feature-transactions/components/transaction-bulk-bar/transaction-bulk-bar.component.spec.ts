import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TransactionBulkBarComponent } from './transaction-bulk-bar.component';

describe('TransactionBulkBarComponent', () => {
  let fixture: ComponentFixture<TransactionBulkBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionBulkBarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionBulkBarComponent);
    fixture.componentRef.setInput('count', 2);
    fixture.componentRef.setInput('filteredCount', 5);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('emits applyCategory with the picked category id and resets the control', async () => {
    const emitted: number[] = [];
    fixture.componentInstance.applyCategory.subscribe((id) => emitted.push(id));

    (
      fixture.componentInstance as unknown as { categoryControl: { setValue: (v: string) => void } }
    ).categoryControl.setValue('7');
    (fixture.componentInstance as unknown as { apply: () => void }).apply();

    expect(emitted).toEqual([7]);
    expect(
      (fixture.componentInstance as unknown as { categoryControl: { value: string } })
        .categoryControl.value,
    ).toBe('');
  });

  it('does nothing when no category is picked', () => {
    const emitted: number[] = [];
    fixture.componentInstance.applyCategory.subscribe((id) => emitted.push(id));

    (fixture.componentInstance as unknown as { apply: () => void }).apply();

    expect(emitted).toEqual([]);
  });

  it('emits selectAllRequested and clearRequested when their buttons are clicked', () => {
    let selectAllCount = 0;
    let clearCount = 0;
    fixture.componentInstance.selectAllRequested.subscribe(() => selectAllCount++);
    fixture.componentInstance.clearRequested.subscribe(() => clearCount++);

    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
    buttons.find((b) => b.textContent?.includes('Select all'))?.click();
    buttons.find((b) => b.textContent?.trim() === 'Clear')?.click();

    expect(selectAllCount).toBe(1);
    expect(clearCount).toBe(1);
  });
});
