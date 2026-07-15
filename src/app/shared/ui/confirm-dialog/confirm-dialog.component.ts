import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
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
  readonly open = model(false);
  readonly confirmed = output<void>();

  protected confirm(): void {
    this.confirmed.emit();
    this.open.set(false);
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
