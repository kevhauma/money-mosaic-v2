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
  private triggerElement: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const dialogElement = this.dialog().nativeElement;
      if (this.open()) {
        this.triggerElement = document.activeElement as HTMLElement | null;
        dialogElement.showModal?.();
      } else {
        dialogElement.close?.();
        this.restoreFocus();
      }
    });
  }

  private restoreFocus(): void {
    const trigger = this.triggerElement;
    this.triggerElement = null;
    if (trigger?.isConnected) {
      trigger.focus();
    }
  }

  protected onDialogDismiss(): void {
    this.open.set(false);
  }
}
