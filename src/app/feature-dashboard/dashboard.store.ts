import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly placeholderMessage = signal('Money Mosaic scaffold is running.');

  readonly message = this.placeholderMessage.asReadonly();
}
