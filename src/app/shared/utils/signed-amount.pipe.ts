import { Pipe, type PipeTransform } from '@angular/core';
import { formatCurrency } from './currency-format';

// Impure — `formatCurrency`'s output depends on the app-wide currency symbol/position settings
// (TICKET-SET-03), not just `amount`, so Angular's pure-pipe memoization (keyed on `amount` alone)
// would miss a settings change that doesn't also change the amount.
@Pipe({ name: 'signedAmount', pure: false })
export class SignedAmountPipe implements PipeTransform {
  transform(amount: number): string {
    return formatCurrency(amount, { signed: true });
  }
}
