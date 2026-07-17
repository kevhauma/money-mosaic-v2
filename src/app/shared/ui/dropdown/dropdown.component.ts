import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { daisyClasses } from '@/shared/utils';

export type DropdownAlign = 'start' | 'end';

/**
 * Wraps daisyUI's `dropdown`/`dropdown-content` shell. The trigger is projected via
 * `<div trigger>` (mirroring `mm-page-header`'s `[actions]` slot convention); the popover body is
 * the default content. `menu` (default `true`) picks the content wrapper tag/class: a `<ul
 * class="dropdown-content menu">` for an actual item list (`<li><a>`/`<button>` per item, authored
 * by the caller — same "own the chrome, not the content" split as `mm-table`), or `menu="false"`
 * for a `<div class="dropdown-content">` holding arbitrary popover content (e.g. a date-range
 * picker's calendar widget) that isn't a `<ul><li>` menu.
 */
@Component({
  selector: 'mm-dropdown',
  imports: [NgTemplateOutlet],
  templateUrl: './dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownComponent {
  readonly align = input<DropdownAlign>();
  readonly menu = input(true);
  readonly class = input('', { alias: 'class' });
  readonly contentClass = input('');

  protected readonly wrapperClasses = computed(() =>
    daisyClasses('dropdown', [this.align() === 'end' && 'dropdown-end'], this.class()),
  );

  protected readonly contentClasses = computed(() =>
    daisyClasses('dropdown-content', [this.menu() && 'menu'], this.contentClass()),
  );
}
