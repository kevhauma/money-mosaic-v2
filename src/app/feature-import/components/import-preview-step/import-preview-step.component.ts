import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ParsedRowResult } from '@/core/import';
import { BadgeComponent } from '@/shared/ui';

@Component({
  selector: 'app-import-preview-step',
  imports: [BadgeComponent],
  templateUrl: './import-preview-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportPreviewStepComponent {
  readonly rows = input.required<ParsedRowResult[]>();

  protected readonly previewRows = computed(() => this.rows().slice(0, 50));
  protected readonly validCount = computed(() => this.rows().filter((row) => row.valid).length);
  protected readonly invalidCount = computed(() => this.rows().length - this.validCount());
}
