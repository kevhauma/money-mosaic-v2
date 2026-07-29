import { effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormControl } from '@angular/forms';

/**
 * Two-way binds a reactive form control to a signal-backed setting (TICKET-SET-07, CR4-5).
 *
 * Every Settings section needs the same dance, and getting it wrong loops: the control pushes user
 * edits to the store, while an `effect` pulls the store back into the control — the pull writes
 * with `emitEvent: false` and only when the value actually differs, so hydration (which resolves
 * *after* the control's initial value is read) and any other tab/reload land in the control
 * without echoing straight back to `write`.
 *
 * Must be called from an injection context (a component field initialiser or constructor); the
 * subscription is torn down with that injector.
 */
export const linkControlToSetting = <T>(
  control: FormControl<T>,
  read: () => T,
  write: (value: T) => void,
): void => {
  control.valueChanges.pipe(takeUntilDestroyed()).subscribe(write);

  effect(() => {
    const value = read();
    if (control.value !== value) {
      control.setValue(value, { emitEvent: false });
    }
  });
};
