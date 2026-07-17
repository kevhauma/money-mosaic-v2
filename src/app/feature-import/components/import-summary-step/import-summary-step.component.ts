import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  FlexComponent,
  TypographyComponent,
} from '@/shared/ui';
import type { ImportBatch } from '@/core/data-access';

@Component({
  selector: 'app-import-summary-step',
  imports: [ButtonComponent, ConfirmDialogComponent, FlexComponent, TypographyComponent],
  templateUrl: './import-summary-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportSummaryStepComponent {
  readonly batch = input.required<ImportBatch>();
  readonly showDoneLink = input(true);
  readonly undo = output<void>();

  protected readonly undoConfirmOpen = signal(false);

  protected confirmUndo(): void {
    this.undo.emit();
  }
}
