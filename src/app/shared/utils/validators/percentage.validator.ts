import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Optional 0-100 percentage control (blank ⇒ valid/unset, per the "undefined ⇒ whole" convention). */
export const percentageValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const raw = control.value as string | number | null;

  if (raw === '' || raw == null) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? null : { percentage: true };
};
