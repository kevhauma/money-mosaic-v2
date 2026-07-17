import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { daisyClasses } from '@/shared/utils';

export type LabelTag = 'p' | 'label';
export type LabelVariant = 'default' | 'error' | 'fieldset';

/**
 * A single field's caption/description/option-row text — never the group heading above a field,
 * that's `mm-fieldset`'s `legend`. Renders as a `<p>` (default — helper/error text under a field)
 * or a `<label>` (`as="label"` — a clickable row wrapping its own checkbox/radio). `variant="fieldset"`
 * switches the base class to daisyUI's `fieldset-label` for a description tied directly to a fieldset.
 */
@Component({
  selector: 'mm-label',
  imports: [NgTemplateOutlet],
  templateUrl: './label.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabelComponent {
  readonly as = input<LabelTag>('p');
  readonly variant = input<LabelVariant>('default');
  readonly for = input<string>();
  readonly class = input('', { alias: 'class' });

  protected readonly tag = computed(() => this.as());

  protected readonly classes = computed(() =>
    daisyClasses(
      this.variant() === 'fieldset' ? 'fieldset-label' : 'label',
      [this.variant() === 'error' && 'text-error'],
      this.class(),
    ),
  );
}
