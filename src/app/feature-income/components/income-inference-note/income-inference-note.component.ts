import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ButtonComponent, FlexComponent, TypographyComponent } from '@/shared/ui';

/**
 * States an assumption the page is making, next to the figure that assumption produced, and opens
 * the control that changes it (TICKET-INC-23).
 *
 * This is what replaced the first-visit setup wall. The wall existed so the user would configure
 * three things before seeing a wrong number; the trade was that they saw nothing at all, and the
 * skip path landed them on the wrong number anyway. Stating each inference where its consequence
 * appears costs one line per panel and is corrigible in place — and unlike a gate, it is still there
 * on the tenth visit, when the user finally notices the figure looks off.
 *
 * The real control is **projected**, never re-implemented: `/income/settings` and this both render
 * `app-income-career-start`, `app-income-main-category` and the lump-sum checklist, so there is one
 * of each bound to one store method.
 */
@Component({
  selector: 'app-income-inference-note',
  imports: [ButtonComponent, FlexComponent, TypographyComponent],
  templateUrl: './income-inference-note.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeInferenceNoteComponent {
  /** The assumption, in a sentence — what was assumed and what it currently is. */
  readonly statement = input.required<string>();
  /** Names the thing being changed, so the toggle is unambiguous with three of these on a page. */
  readonly subject = input.required<string>();

  protected readonly open = signal(false);

  protected readonly toggleLabel = computed(() => (this.open() ? 'Close' : 'Change this'));

  protected readonly toggleAriaLabel = computed(
    () => `${this.open() ? 'Close' : 'Change'} ${this.subject()}`,
  );

  protected toggle(): void {
    this.open.update((open) => !open);
  }
}
