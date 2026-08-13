import type { SavingsGoal } from '@/core/data-access';

/**
 * One row of the goals list, resolved once in the component (TICKET-FUT-04) so the `@for` reads
 * plain fields rather than calling a formatter per row per change-detection pass — the
 * `CategoryRowVm` convention.
 *
 * `isFirst`/`isLast` drive the keyboard move buttons' disabled state; they are what makes the
 * funding order reachable without a pointer.
 */
export type GoalRowVm = {
  goal: SavingsGoal;
  /** `formatCurrency()`d target — masked by `mm-privacy-blur`, never blanked here. */
  amountLabel: string;
  /**
   * The secondary line: the `formatDate()`d "wanted by" and the note, already joined — `''` when
   * the goal has neither. Assembled in the class rather than by concatenating three bindings in
   * the template.
   */
  metaLabel: string;
  isFirst: boolean;
  isLast: boolean;
};
