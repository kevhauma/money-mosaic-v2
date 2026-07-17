import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daisyClasses } from '@/shared/utils';

/**
 * Wraps daisyUI's `fieldset`/`fieldset-legend` pattern — this codebase applies it per-field
 * (a caption above one control) at least as often as around a genuine multi-control group, so
 * "fieldset" here means "has a legend caption", not strictly "groups several fields". Use `for`
 * when the legend should associate directly with a single control's `id` (renders a `<label
 * class="fieldset-legend">` instead of a block-level `<legend>`, e.g. for an inline row layout);
 * omit it for the standard stacked legend-above-content shape. `legend` itself is optional — a
 * fieldset grouping several already-labelled option rows (e.g. a radio-button list) with no
 * caption of its own has no `<legend>` at all.
 */
@Component({
  selector: 'mm-fieldset',
  imports: [],
  templateUrl: './fieldset.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldsetComponent {
  readonly legend = input<string>();
  readonly for = input<string>();
  readonly class = input('', { alias: 'class' });

  protected readonly classes = computed(() => daisyClasses('fieldset', [], this.class()));
}
