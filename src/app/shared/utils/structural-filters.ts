import { computed, type Injector, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, type Observable } from 'rxjs';

/** Shallow key-by-key equality — enough for a flat, string-only structural-filters shape. */
function shallowEqual<T extends Record<string, string>>(a: T, b: T): boolean {
  return (Object.keys(a) as (keyof T)[]).every((key) => a[key] === b[key]);
}

/**
 * Turns a filter form's `valueChanges` into a signal of just its structural (non-debounced) fields —
 * the ones that should apply immediately, as opposed to a free-text needle usually paired with
 * {@link debouncedTextSignal} (CR-2.4). `pick` narrows the raw form value down to the structural
 * shape; a shallow key comparison of that shape (via `distinctUntilChanged`) keeps an emission that
 * only changed the text field, or re-emitted the same structural values, from re-propagating.
 *
 * Call it in an injection context (constructor or field initialiser), or pass `options.injector`.
 */
export function structuralFiltersSignal<TFormValue, TStructural extends Record<string, string>>(
  valueChanges: Observable<TFormValue>,
  pick: (value: TFormValue) => TStructural,
  initialFormValue: TFormValue,
  options: { injector?: Injector } = {},
): Signal<TStructural> {
  return toSignal(valueChanges.pipe(map(pick), distinctUntilChanged(shallowEqual)), {
    initialValue: pick(initialFormValue),
    injector: options.injector,
  });
}

/**
 * Combines a {@link structuralFiltersSignal} with a {@link debouncedTextSignal} into the single
 * filter-set signal every filter form emits on its `filtersChange` output (CR-2.4, CR3-2.5).
 */
export function combinedFiltersSignal<TStructural extends Record<string, string>>(
  structuralFilters: Signal<TStructural>,
  debouncedText: Signal<string>,
): Signal<TStructural & { text: string }> {
  return computed(() => ({ ...structuralFilters(), text: debouncedText() }));
}

/**
 * True when any structural field or the debounced text needle is non-empty — powers the
 * "clear filters" affordance shared by every filter form (CR-2.4, CR3-2.5).
 */
export function hasActiveFiltersSignal(
  structuralFilters: Signal<Record<string, string>>,
  debouncedText: Signal<string>,
): Signal<boolean> {
  return computed(
    () =>
      debouncedText() !== '' || Object.values(structuralFilters()).some((value) => value !== ''),
  );
}
