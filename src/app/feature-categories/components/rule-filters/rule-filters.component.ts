import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerFilterOff } from '@ng-icons/tabler-icons';
import { ButtonComponent, InputComponent, SelectComponent } from '@/shared/ui';
import { debouncedTextSignal } from '@/shared/utils';
import { CategoriesStore } from '@/core/state';
import type { RuleFilters } from '../../rule-filters';

/** The structural (non-text) filter fields — applied immediately, unlike the debounced text needle. */
type StructuralFilters = Omit<RuleFilters, 'text'>;

@Component({
  selector: 'app-rule-filters',
  imports: [ReactiveFormsModule, NgIcon, ButtonComponent, InputComponent, SelectComponent],
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

  /** Structural filters apply immediately; `distinctUntilChanged` keeps text keystrokes from re-emitting them. */
  private readonly structuralFilters = toSignal(
    this.filterForm.valueChanges.pipe(
      map((value): StructuralFilters => ({
        categoryId: value.categoryId ?? '',
        enabled: (value.enabled as RuleFilters['enabled']) ?? '',
      })),
      distinctUntilChanged((a, b) => a.categoryId === b.categoryId && a.enabled === b.enabled),
    ),
    { initialValue: { categoryId: '', enabled: '' } },
  );

  /** Free-text needle, debounced so typing doesn't re-run the filter/render pipeline on every keystroke (CR-2.4). */
  private readonly debouncedText = debouncedTextSignal(this.filterForm.controls.text);

  /** Single filter set that changes on either a structural change or a settled text change. */
  private readonly filters = computed<RuleFilters>(() => ({
    ...this.structuralFilters(),
    text: this.debouncedText(),
  }));

  protected readonly hasActiveFilters = computed(
    () =>
      this.debouncedText() !== '' ||
      Object.values(this.structuralFilters()).some((value) => value !== ''),
  );

  constructor() {
    effect(() => this.filtersChange.emit(this.filters()));
  }

  protected clearFilters(): void {
    this.filterForm.reset({ text: '', categoryId: '', enabled: '' });
  }
}
