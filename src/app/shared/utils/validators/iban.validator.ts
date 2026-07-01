import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const IBAN_PATTERN = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/;

const ibanChecksumIsValid = (iban: string): boolean => {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));

  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    remainder = Number(`${remainder}${numeric.slice(i, i + 7)}`) % 97;
  }

  return remainder === 1;
};

export const ibanValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = (control.value as string | null)?.replace(/\s/g, '').toUpperCase();

  if (!value) {
    return null;
  }

  return IBAN_PATTERN.test(value) && ibanChecksumIsValid(value) ? null : { iban: true };
};
