import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CategorySelectCellComponent,
  type CategorySelectOption,
} from './category-select-cell.component';

const options: CategorySelectOption[] = [
  { value: '7', label: 'Groceries' },
  { value: '9', label: 'Rent' },
];

describe('CategorySelectCellComponent', () => {
  let fixture: ComponentFixture<CategorySelectCellComponent>;

  const setup = async (selectedId = ''): Promise<HTMLSelectElement> => {
    await TestBed.configureTestingModule({
      imports: [CategorySelectCellComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CategorySelectCellComponent);
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('selectedId', selectedId);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('select') as HTMLSelectElement;
  };

  const emitted = (): (number | undefined)[] => {
    const values: (number | undefined)[] = [];
    fixture.componentInstance.categoryChange.subscribe((value) => values.push(value));
    return values;
  };

  it('renders an Uncategorised option ahead of every supplied category', async () => {
    const select = await setup();

    expect(Array.from(select.options).map((option) => option.textContent?.trim())).toEqual([
      'Uncategorised',
      'Groceries',
      'Rent',
    ]);
    expect(Array.from(select.options).map((option) => option.value)).toEqual(['', '7', '9']);
  });

  it('marks the option matching selectedId as selected', async () => {
    const select = await setup('9');

    expect(select.value).toBe('9');
  });

  it('falls back to the Uncategorised option when selectedId is empty', async () => {
    const select = await setup('');

    expect(select.value).toBe('');
  });

  it('emits the picked category as a number', async () => {
    const select = await setup('');
    const values = emitted();

    select.value = '7';
    select.dispatchEvent(new Event('change'));

    expect(values).toEqual([7]);
  });

  it('emits undefined — not an empty string or NaN — when set back to Uncategorised', async () => {
    const select = await setup('7');
    const values = emitted();

    select.value = '';
    select.dispatchEvent(new Event('change'));

    expect(values).toEqual([undefined]);
  });
});
