import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import { daisyClasses } from '@/shared/utils';

let nextTitleId = 0;

@Component({
  selector: 'mm-modal',
  templateUrl: './mm-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MmModalComponent {
  readonly open = model(false);
  readonly class = input('', { alias: 'class' });

  protected readonly titleId = `mm-modal-title-${nextTitleId++}`;
  protected readonly boxClass = computed(() => daisyClasses('modal-box', [], this.class()));

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

  protected onDialogDismiss(): void {
    this.open.set(false);
  }
}
