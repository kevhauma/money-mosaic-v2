import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent, PaperComponent, TypographyComponent } from '@/shared/ui';

/**
 * The import wizard's step-2 "this file is riding the shared batch mapping" card (TICKET-IMP-12,
 * CR4-1 §1 Option C) — purely presentational: `mismatchMessage` set means the file's headers don't
 * match the batch mapping (shown in place of the default waiting copy); `null` means it's still
 * waiting to auto-parse/auto-commit. Either way, "Map this file individually" hands the file back
 * to the manual mapping form via the emitted output.
 */
@Component({
  selector: 'app-batch-wait-card',
  imports: [ButtonComponent, PaperComponent, TypographyComponent],
  templateUrl: './batch-wait-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchWaitCardComponent {
  readonly fileName = input.required<string>();
  readonly mismatchMessage = input<string | null>(null);

  readonly mapIndividually = output<void>();
}
