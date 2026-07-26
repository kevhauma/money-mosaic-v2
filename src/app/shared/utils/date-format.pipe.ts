import { Pipe, type PipeTransform } from '@angular/core';
import { formatDate } from './date-format';

// Impure — `formatDate`'s output depends on the app-wide locale setting (TICKET-SET-04), not just
// the input date, so Angular's pure-pipe memoization (keyed on the date alone) would miss a
// settings change that doesn't also change the date.
@Pipe({ name: 'localeDate', pure: false })
export class LocaleDatePipe implements PipeTransform {
  transform(isoDate: string): string {
    return formatDate(isoDate);
  }
}
