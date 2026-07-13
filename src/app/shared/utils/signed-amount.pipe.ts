import { Pipe, type PipeTransform } from '@angular/core';
import { formatCurrency } from './currency-format';

@Pipe({ name: 'signedAmount' })
export class SignedAmountPipe implements PipeTransform {
  transform(amount: number): string {
    return formatCurrency(amount, { signed: true });
  }
}
