import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TypographyComponent } from '@/shared/ui';

/**
 * The resolved-sample/duplicate-warning caption pair repeated under every column-mapping select
 * (TICKET-IMP-09) — pulled out once fallow flagged the same two conditionals duplicated across
 * `column-map-simple-field`/`column-map-counterparty-field`/`column-map-amount-field` (the latter
 * up to three times per template, once per select).
 */
@Component({
  selector: 'app-column-map-sample-caption',
  imports: [TypographyComponent],
  templateUrl: './column-map-sample-caption.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnMapSampleCaptionComponent {
  readonly sample = input<string>();
  readonly warning = input<string>();
}
