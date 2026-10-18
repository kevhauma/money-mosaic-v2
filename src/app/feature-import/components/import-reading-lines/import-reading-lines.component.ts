import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PaperComponent, TypographyComponent } from '@/shared/ui';
import type { ReadingLineVm } from '../../reading-statements';

/**
 * The first lines of a file as currently read (TICKET-IMP-16): line numbers, the separator marked
 * between cells, the header line set apart, and any cell whose letters look broken under the
 * current encoding called out. Split from `import-reading-section` to keep that template's
 * complexity under the fallow ceiling.
 */
@Component({
  selector: 'app-import-reading-lines',
  imports: [PaperComponent, TypographyComponent],
  templateUrl: './import-reading-lines.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportReadingLinesComponent {
  readonly lines = input.required<ReadingLineVm[]>();
  readonly delimiter = input.required<string>();

  /** A tab is invisible in a monospace line, so it is drawn as an arrow. */
  protected readonly delimiterMark = computed(() =>
    this.delimiter() === '\t' ? '⇥' : this.delimiter(),
  );
}
