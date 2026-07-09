import { FormControl } from '@angular/forms';
import { percentageValidator } from './percentage.validator';

describe('percentageValidator', () => {
  it('accepts a blank/unset value', () => {
    expect(percentageValidator(new FormControl(''))).toBeNull();
    expect(percentageValidator(new FormControl(null))).toBeNull();
  });

  it('accepts values within 0-100', () => {
    expect(percentageValidator(new FormControl(0))).toBeNull();
    expect(percentageValidator(new FormControl(50))).toBeNull();
    expect(percentageValidator(new FormControl(100))).toBeNull();
  });

  it('rejects out-of-range or non-numeric values', () => {
    expect(percentageValidator(new FormControl(-1))).toEqual({ percentage: true });
    expect(percentageValidator(new FormControl(150))).toEqual({ percentage: true });
    expect(percentageValidator(new FormControl('abc'))).toEqual({ percentage: true });
  });
});
