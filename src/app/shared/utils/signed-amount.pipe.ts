import { Pipe, type PipeTransform } from '@angular/core';

const EUR_FORMATTER = new Intl.NumberFormat('en-BE', {
  style: 'currency',
  currency: 'EUR',
  signDisplay: 'always',
});

@Pipe({ name: 'signedAmount' })
export class SignedAmountPipe implements PipeTransform {
  transform(amount: number): string {
    return EUR_FORMATTER.format(amount);
  }
}
