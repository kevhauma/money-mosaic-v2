import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'mm-confirm-dialog',
  imports: [ButtonComponent],
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly danger = input(false);
  readonly open = model(false);
  readonly confirmed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialogElement = this.dialog().nativeElement;
      if (this.open()) {
        dialogElement.showModal?.();
      } else {
        dialogElement.close?.();
      }
    });
  }

  protected confirm(): void {
    this.confirmed.emit();
    this.open.set(false);
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
