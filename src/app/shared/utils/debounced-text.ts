import { type Injector, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map, type Observable } from 'rxjs';

/** Default debounce for a search box — long enough to skip mid-word keystrokes, short enough to feel instant. */
const DEFAULT_TEXT_DEBOUNCE_MS = 150;

/** Trim + lowercase — the usual normalisation for a case-insensitive, whitespace-tolerant search needle. */
const normaliseNeedle = (value: string): string => value.trim().toLowerCase();

export type DebouncedTextOptions = {
  /** Debounce window in ms (default {@link DEFAULT_TEXT_DEBOUNCE_MS}). */
  debounceMs?: number;
  /** Seed value before the source emits (default `''`); normalised the same as later values. */
  initialValue?: string;
  /** How each emitted value is normalised before de-duping (default trim + lowercase). */
  normalise?: (value: string) => string;
  /** Injection context for `toSignal`; only needed when called outside a constructor/field initialiser. */
  injector?: Injector;
};

/**
 * Turns a text source — a `FormControl<string>` or its `valueChanges` — into a debounced, normalised,
 * distinct signal. This is the "search needle" pattern (CR-2.4): typing settles for `debounceMs` and
 * only distinct normalised values propagate, so downstream `computed()` filter/render pipelines don't
 * re-run on every keystroke.
 *
 * Call it in an injection context (constructor or field initialiser), or pass `options.injector`.
 */
export function debouncedTextSignal(
  source: FormControl<string> | Observable<string>,
  options: DebouncedTextOptions = {},
): Signal<string> {
  const {
    debounceMs = DEFAULT_TEXT_DEBOUNCE_MS,
    initialValue = '',
    normalise = normaliseNeedle,
    injector,
  } = options;

  const value$ = source instanceof FormControl ? source.valueChanges : source;

  return toSignal(value$.pipe(debounceTime(debounceMs), map(normalise), distinctUntilChanged()), {
    initialValue: normalise(initialValue),
    injector,
  });
}
