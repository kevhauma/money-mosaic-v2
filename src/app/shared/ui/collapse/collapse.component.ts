import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { daisyClasses } from '@/shared/utils';

let nextTitleId = 0;

/** Wraps daisyUI's `collapse` pattern as an independently expandable panel (not a radio-exclusive accordion) — each instance owns its own open state via `model()`. */
@Component({
  selector: 'mm-collapse',
  templateUrl: './collapse.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollapseComponent {
  readonly open = model(false);
  readonly class = input('', { alias: 'class' });

  protected readonly titleId = `mm-collapse-title-${nextTitleId++}`;
  protected readonly contentId = `mm-collapse-content-${nextTitleId}`;

  protected readonly rootClass = computed(() =>
    daisyClasses(
      'collapse collapse-arrow rounded-box border border-base-300 bg-base-100',
      [this.open() && 'collapse-open'],
      this.class(),
    ),
  );

  protected toggle(): void {
    this.open.update((open) => !open);
  }
}
