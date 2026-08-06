import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CategoriesRepository, type Category } from '@/core/data-access';
import { CategoriesStore } from '@/core/state';
import { CategoryExclusionDropdownComponent } from './category-exclusion-dropdown.component';

const category = (id: number, name: string, overrides: Partial<Category> = {}): Category => ({
  id,
  name,
  kind: 'expense',
  color: '#ff0000',
  icon: 'tablerTag',
  archived: false,
  isSystem: false,
  ...overrides,
});

describe('CategoryExclusionDropdownComponent (TICKET-STAT-32)', () => {
  let fixture: ComponentFixture<CategoryExclusionDropdownComponent>;

  const rows = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.dropdown-content li'));

  const checkboxes = (): HTMLInputElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('input[type="checkbox"]'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryExclusionDropdownComponent],
      providers: [
        {
          provide: CategoriesRepository,
          useValue: {
            add: vi.fn((entry: Category) => Promise.resolve(entry.id ?? 1)),
            getAll: vi.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compileComponents();

    await TestBed.inject(CategoriesStore).hydrate();

    fixture = TestBed.createComponent(CategoryExclusionDropdownComponent);
    fixture.componentRef.setInput('excludedIds', new Set<number>());
    fixture.detectChanges();
  });

  const seed = async (...categories: Category[]): Promise<void> => {
    for (const entry of categories) await TestBed.inject(CategoriesStore).addCategory(entry);
    fixture.detectChanges();
  };

  it('renders nothing when there is no expense category to exclude', async () => {
    await seed(category(9, 'Salary', { kind: 'income' }));

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('lists active expense categories only — no income, no archived', async () => {
    await seed(
      category(1, 'Groceries'),
      category(2, 'Rent'),
      category(3, 'Old habit', { archived: true }),
      category(9, 'Salary', { kind: 'income' }),
    );

    expect(rows().map((row) => row.textContent?.trim())).toEqual(['Groceries', 'Rent']);
  });

  it('ticks the categories the caller says are excluded, and counts them on the trigger', async () => {
    await seed(category(1, 'Groceries'), category(2, 'Rent'));
    fixture.componentRef.setInput('excludedIds', new Set([2]));
    fixture.detectChanges();

    expect(checkboxes().map((box) => box.checked)).toEqual([false, true]);
    expect(fixture.nativeElement.textContent.replace(/\s+/g, ' ')).toContain(
      'Exclude categories (1)',
    );
  });

  it('emits the whole next set when a category is ticked, ready for a store setter', async () => {
    await seed(category(1, 'Groceries'), category(2, 'Rent'));
    fixture.componentRef.setInput('excludedIds', new Set([1]));
    fixture.detectChanges();
    const emitted: number[][] = [];
    fixture.componentInstance.excludedChange.subscribe((ids) => emitted.push(ids));

    checkboxes()[1].dispatchEvent(new Event('change'));

    expect(emitted).toEqual([[1, 2]]);
  });

  it('emits the set without a category when it is unticked', async () => {
    await seed(category(1, 'Groceries'), category(2, 'Rent'));
    fixture.componentRef.setInput('excludedIds', new Set([1, 2]));
    fixture.detectChanges();
    const emitted: number[][] = [];
    fixture.componentInstance.excludedChange.subscribe((ids) => emitted.push(ids));

    checkboxes()[0].dispatchEvent(new Event('change'));

    expect(emitted).toEqual([[2]]);
  });

  it('holds no state of its own — the caller owns the excluded set', async () => {
    await seed(category(1, 'Groceries'));
    fixture.componentInstance.excludedChange.subscribe(() => {
      /* caller deliberately does not write back */
    });

    checkboxes()[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(checkboxes()[0].checked).toBe(false);
  });
});
