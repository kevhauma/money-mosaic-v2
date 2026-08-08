import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Category } from '@/core/data-access';
import { CategoryFormComponent, type CategoryFormValue } from './category-form.component';

const rent: Category = {
  id: 1,
  name: 'Rent',
  kind: 'expense',
  color: '#7F77DD',
  icon: 'tag',
  archived: false,
  isSystem: false,
  activeFrom: '2020-01-01',
  activeUntil: '2023-06-30',
};

describe('CategoryFormComponent', () => {
  let component: CategoryFormComponent;
  let fixture: ComponentFixture<CategoryFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /** The form is `protected`; a spec reaching in is the established way to drive it here. */
  const form = (): CategoryFormComponent['form'] =>
    (component as unknown as { form: CategoryFormComponent['form'] }).form;

  const submit = (): CategoryFormValue | undefined => {
    let emitted: CategoryFormValue | undefined;
    component.saved.subscribe((value) => (emitted = value));
    (component as unknown as { submit: () => void }).submit();
    return emitted;
  };

  const openWith = async (category: Category | null): Promise<void> => {
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  describe('applicability window (TICKET-CAT-10)', () => {
    it('loads an existing category’s window into the form', async () => {
      await openWith(rent);

      expect(form().getRawValue()).toMatchObject({
        activeFrom: '2020-01-01',
        activeUntil: '2023-06-30',
      });
    });

    it('opens blank for a new category, and for one with no window at all', async () => {
      await openWith(null);
      expect(form().getRawValue()).toMatchObject({ activeFrom: '', activeUntil: '' });

      await openWith({ ...rent, activeFrom: undefined, activeUntil: undefined });
      expect(form().getRawValue()).toMatchObject({ activeFrom: '', activeUntil: '' });
    });

    it('emits both bounds when set', async () => {
      await openWith(rent);

      expect(submit()).toMatchObject({ activeFrom: '2020-01-01', activeUntil: '2023-06-30' });
    });

    it('emits undefined rather than an empty string for a cleared bound', async () => {
      await openWith(rent);
      form().patchValue({ activeFrom: '', activeUntil: '' });

      const emitted = submit();
      // `''` would persist as a bound comparing earlier than every real date.
      expect(emitted?.activeFrom).toBeUndefined();
      expect(emitted?.activeUntil).toBeUndefined();
    });

    it('accepts a window open on either side', async () => {
      await openWith(null);
      form().patchValue({ name: 'Gym', activeFrom: '2024-01-01', activeUntil: '' });

      expect(form().valid).toBe(true);
      expect(submit()).toMatchObject({ activeFrom: '2024-01-01', activeUntil: undefined });
    });

    it('rejects an until that falls before the from, and emits nothing', async () => {
      await openWith(null);
      form().patchValue({ name: 'Rent', activeFrom: '2023-06-30', activeUntil: '2020-01-01' });

      expect(form().errors?.['applicabilityRange']).toBe(true);
      expect(submit()).toBeUndefined();
    });

    it('accepts a single-day window, where the two bounds are equal', async () => {
      await openWith(null);
      form().patchValue({ name: 'One-off', activeFrom: '2024-05-01', activeUntil: '2024-05-01' });

      expect(form().valid).toBe(true);
    });
  });
});
