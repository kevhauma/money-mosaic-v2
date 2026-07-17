import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { daisyClasses } from '@/shared/utils';

export type TextVariant = 'display' | 'heading' | 'subheading' | 'body' | 'caption' | 'label';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextColor =
  | 'base-content'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';
export type TextAlign = 'left' | 'center' | 'right';
export type TextTag = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4';

const WEIGHT_CLASSES: Record<TextWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

type VariantSpec = {
  text: string;
  weight?: TextWeight;
  color?: TextColor;
  tracking?: string;
  leading?: string;
  uppercase?: boolean;
};

/** design-language.md §4 — "Swiss Modernism 2.0" type scale: high-contrast size jumps, tight tracking on large text, generous line-height on body copy. */
const VARIANTS: Record<TextVariant, VariantSpec> = {
  display: { text: 'text-[2.25rem]', weight: 'bold', tracking: '-0.02em', leading: '1.1' },
  heading: {
    text: 'text-[1.5rem]',
    weight: 'semibold',
    tracking: '-0.01em',
    leading: '1.25',
    color: 'base-content',
  },
  subheading: {
    text: 'text-[1.0625rem]',
    weight: 'medium',
    leading: '1.4',
    color: 'base-content',
  },
  body: { text: 'text-base', leading: '1.6' },
  caption: { text: 'text-[0.8125rem]', leading: '1.5', color: 'base-content' },
  label: {
    text: 'text-[0.75rem]',
    weight: 'semibold',
    tracking: '0.06em',
    leading: '1.4',
    uppercase: true,
    color: 'base-content',
  },
};

/** Opacity applied to each variant's default (unopinionated when `color` is overridden). */
const VARIANT_OPACITY: Partial<Record<TextVariant, string>> = {
  subheading: '/70',
  caption: '/70',
  label: '/60',
};

/** An explicit `color` always wins; otherwise falls back to the variant's own default (with its baked-in opacity), if it has one. */
function resolveColorClass(variant: TextVariant, color: TextColor | undefined): string | undefined {
  if (color) return `text-${color}`;
  const defaultColor = VARIANTS[variant].color;
  return defaultColor && `text-${defaultColor}${VARIANT_OPACITY[variant] ?? ''}`;
}

@Component({
  selector: 'mm-text',
  imports: [NgTemplateOutlet],
  templateUrl: './typography.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypographyComponent {
  readonly variant = input<TextVariant>('body');
  readonly weight = input<TextWeight>();
  readonly color = input<TextColor>();
  readonly align = input<TextAlign>();
  readonly as = input<TextTag>('span');
  /** design-language.md §4's tabular-figures rule — every monetary amount and numeric table column should align digits vertically. */
  readonly numeric = input(false);
  readonly class = input('', { alias: 'class' });

  /** `as` is a reserved word in Angular template expressions (`expr as x`), so the template can't call `as()` directly (e.g. inside `@switch`) — this computed gives the template a non-reserved name to switch on instead, without aliasing the input itself (this repo's `no-input-rename` lint rule only allows aliasing `class`/`style`). */
  protected readonly tag = computed(() => this.as());

  protected readonly classes = computed(() => {
    const spec = VARIANTS[this.variant()];
    const weight = this.weight() ?? spec.weight;
    const colorClass = resolveColorClass(this.variant(), this.color());

    return daisyClasses(
      spec.text,
      [
        weight && WEIGHT_CLASSES[weight],
        colorClass,
        spec.tracking && `tracking-[${spec.tracking}]`,
        spec.leading && `leading-[${spec.leading}]`,
        spec.uppercase && 'uppercase',
        this.align() && `text-${this.align()}`,
        this.numeric() && 'tabular-nums',
      ],
      this.class(),
    );
  });
}
