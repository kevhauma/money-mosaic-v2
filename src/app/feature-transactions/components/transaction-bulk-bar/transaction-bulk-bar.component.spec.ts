import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { CategoriesRepository, TransactionsRepository, type Category } from '@/core/data-access';
import { CategoriesStore } from '@/core/state';
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

  it('shows and emits the link-as-transfer action only when canLink is true', async () => {
    let linkCount = 0;
    fixture.componentInstance.linkRequested.subscribe(() => linkCount++);

    const findLinkButton = () =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Link as transfer'),
      );

    expect(findLinkButton()).toBeUndefined();

    fixture.componentRef.setInput('canLink', true);
    await fixture.whenStable();
    fixture.detectChanges();

    findLinkButton()?.click();
    expect(linkCount).toBe(1);
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

  it('requires confirmation before emitting deleteRequested', async () => {
    let deleteCount = 0;
    fixture.componentInstance.deleteRequested.subscribe(() => deleteCount++);

    const nativeElement = fixture.nativeElement as HTMLElement;
    [...nativeElement.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Delete')
      ?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Clicking the bar's own Delete button only opens the confirm dialog — nothing emitted yet.
    expect(deleteCount).toBe(0);
    expect(nativeElement.textContent).toContain('Delete 2 transactions?');

    [...nativeElement.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Delete permanently')
      ?.click();

    expect(deleteCount).toBe(1);
  });
});

describe('TransactionBulkBarComponent: applicability-aware picker (TICKET-CAT-11)', () => {
  let fixture: ComponentFixture<TransactionBulkBarComponent>;

  const category = (id: number, name: string, window: Partial<Category> = {}): Category => ({
    id,
    name,
    kind: 'expense',
    color: '#7F77DD',
    icon: 'tag',
    archived: false,
    isSystem: false,
    sortOrder: id,
    ...window,
  });

  const setupWith = async (
    categories: Category[],
    selectedDateSpan: { from: string; to: string } | null,
  ): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [TransactionBulkBarComponent],
      providers: [
        provideRouter([]),
        { provide: TransactionsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        {
          provide: CategoriesRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(categories) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionBulkBarComponent);
    await TestBed.inject(CategoriesStore).hydrate();
    fixture.componentRef.setInput('count', 2);
    fixture.componentRef.setInput('filteredCount', 5);
    fixture.componentRef.setInput('selectedDateSpan', selectedDateSpan);
    await fixture.whenStable();
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  const optionLabels = (host: HTMLElement): string[] =>
    [...host.querySelectorAll('mm-select option')].map(
      (option) => option.textContent?.trim() ?? '',
    );

  it('offers every active category when nothing is selected yet', async () => {
    const host = await setupWith(
      [category(7, 'Groceries'), category(9, 'Rent', { activeUntil: '2023-06-30' })],
      null,
    );

    expect(optionLabels(host)).toEqual(['Assign category…', 'Groceries', 'Rent']);
  });

  it('drops a category whose window misses the selected rows entirely', async () => {
    const host = await setupWith(
      [category(7, 'Groceries'), category(9, 'Rent', { activeUntil: '2023-06-30' })],
      { from: '2026-06-01', to: '2026-07-01' },
    );

    expect(optionLabels(host)).toEqual(['Assign category…', 'Groceries']);
  });

  it('keeps a category whose window overlaps any part of the selected span', async () => {
    const host = await setupWith([category(9, 'Rent', { activeUntil: '2023-06-30' })], {
      from: '2023-01-01',
      to: '2026-07-01',
    });

    expect(optionLabels(host)).toEqual(['Assign category…', 'Rent']);
  });

  it('leaves windowless categories offered for any span', async () => {
    const host = await setupWith([category(7, 'Groceries')], {
      from: '1999-01-01',
      to: '1999-01-02',
    });

    expect(optionLabels(host)).toEqual(['Assign category…', 'Groceries']);
  });
});
