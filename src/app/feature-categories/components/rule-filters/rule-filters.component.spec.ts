import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { RuleFilters } from '../../rule-filters';
import { RuleFiltersComponent } from './rule-filters.component';

/** Protected surface we reach into for form/behaviour assertions. */
type Internals = {
  filterForm: { value: unknown; patchValue: (value: Record<string, string>) => void };
  hasActiveFilters: () => boolean;
  clearFilters: () => void;
};

describe('RuleFiltersComponent', () => {
  let fixture: ComponentFixture<RuleFiltersComponent>;
  let emitted: RuleFilters[];

  const setup = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [RuleFiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RuleFiltersComponent);
    emitted = [];
    fixture.componentInstance.filtersChange.subscribe((value) => emitted.push(value));
    await fixture.whenStable();
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  it('should create with no filters active', async () => {
    await setup();
    expect(fixture.componentInstance).toBeTruthy();
    expect(internals().hasActiveFilters()).toBe(false);
  });

  it('emits the settled filters after a structural field changes', async () => {
    await setup();

    internals().filterForm.patchValue({ categoryId: '3', enabled: 'enabled' });
    await fixture.whenStable();

    expect(emitted.at(-1)).toEqual({ text: '', categoryId: '3', enabled: 'enabled' });
    expect(internals().hasActiveFilters()).toBe(true);
  });

  it('clearFilters resets every field and disables itself once nothing is active', async () => {
    await setup();
    internals().filterForm.patchValue({ categoryId: '3', text: 'groceries' });
    await fixture.whenStable();
    expect(internals().hasActiveFilters()).toBe(true);

    internals().clearFilters();
    await fixture.whenStable();

    expect(internals().filterForm.value).toEqual({ text: '', categoryId: '', enabled: '' });
    expect(internals().hasActiveFilters()).toBe(false);
  });
});
