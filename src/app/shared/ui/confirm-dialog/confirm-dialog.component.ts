import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { MmModalComponent } from '../modal/mm-modal.component';

@Component({
  selector: 'mm-confirm-dialog',
  imports: [ButtonComponent, MmModalComponent],
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly danger = input(false);
  /** When set, the confirm button stays disabled until the typed field exactly matches this phrase. */
  readonly confirmPhrase = input<string | null>(null);
  readonly open = model(false);
  readonly confirmed = output<void>();

  protected readonly typedPhrase = signal('');
  protected readonly canConfirm = computed(() => {
    const phrase = this.confirmPhrase();
    return !phrase || this.typedPhrase() === phrase;
  });

  constructor() {
    // Clear any previously-typed phrase whenever the dialog (re)opens, so a stale match can't
    // carry over from a prior open of the same dialog instance.
    effect(() => {
      if (this.open()) this.typedPhrase.set('');
    });
  }

  protected confirm(): void {
    if (!this.canConfirm()) return;
    this.confirmed.emit();
    this.open.set(false);
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
