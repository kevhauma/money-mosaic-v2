import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  output,
  type Signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerFilterOff } from '@ng-icons/tabler-icons';
import { ButtonComponent, InputComponent, PaperComponent, SelectComponent } from '@/shared/ui';
import {
  combinedFiltersSignal,
  debouncedTextSignal,
  hasActiveFiltersSignal,
  structuralFiltersSignal,
} from '@/shared/utils';
import { CategoriesStore } from '@/core/state';
import type { RuleFilters } from '../../rule-filters';

/** The structural (non-text) filter fields — applied immediately, unlike the debounced text needle. */
type StructuralFilters = Omit<RuleFilters, 'text'>;

@Component({
  selector: 'app-rule-filters',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    ButtonComponent,
    InputComponent,
    PaperComponent,
    SelectComponent,
  ],
  templateUrl: './rule-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerFilterOff })],
})
export class RuleFiltersComponent {
  protected readonly categoriesStore = inject(CategoriesStore);

  private readonly formBuilder = inject(FormBuilder);

  /** Emits the combined filter set whenever a structural field changes or the text needle settles. */
  readonly filtersChange = output<RuleFilters>();

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    text: [''],
    categoryId: [''],
    enabled: [''],
  });

  /** Structural filters apply immediately; text keystrokes never re-emit them (CR-2.4, CR3-2.5). */
  private readonly structuralFilters = structuralFiltersSignal(
    this.filterForm.valueChanges,
    (value): StructuralFilters => ({
      categoryId: value.categoryId ?? '',
      enabled: (value.enabled as RuleFilters['enabled']) ?? '',
    }),
    this.filterForm.getRawValue(),
  );

  /** Free-text needle, debounced so typing doesn't re-run the filter/render pipeline on every keystroke (CR-2.4). */
  private readonly debouncedText = debouncedTextSignal(this.filterForm.controls.text);

  /** Single filter set that changes on either a structural change or a settled text change. */
  private readonly filters: Signal<RuleFilters> = combinedFiltersSignal(
    this.structuralFilters,
    this.debouncedText,
  );

  protected readonly hasActiveFilters = hasActiveFiltersSignal(
    this.structuralFilters,
    this.debouncedText,
  );

  constructor() {
    effect(() => this.filtersChange.emit(this.filters()));
  }

  protected clearFilters(): void {
    this.filterForm.reset({ text: '', categoryId: '', enabled: '' });
  }
}
