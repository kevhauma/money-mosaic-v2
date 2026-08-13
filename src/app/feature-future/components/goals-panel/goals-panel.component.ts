import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerPlus, tablerTargetArrow } from '@ng-icons/tabler-icons';
import type { SavingsGoal } from '@/core/data-access';
import { AppSettingsStore, GoalsStore } from '@/core/state';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  FlexComponent,
  LoadingSkeletonComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import { createConfirmState, formatCurrency, formatDate } from '@/shared/utils';
import type { GoalRowVm } from '../../goal-row-vm';
import { GoalFormComponent, type GoalFormValue } from '../goal-form/goal-form.component';
import { GoalRowComponent } from '../goal-row/goal-row.component';

/**
 * The Goals section of `/future` (FR-FUT-2, TICKET-FUT-04): what the user wants, what each costs,
 * and — the part that matters — the order they'd actually buy them in.
 *
 * **The order is not cosmetic.** Unlike the dashboard customize panel this borrows its drag
 * interaction from, this list changes the numbers: TICKET-FUT-05 funds goals sequentially, so
 * dragging a goal up pushes every goal below it further out. That is why the caption saying so is
 * an acceptance criterion, and why the order is reachable **from the keyboard** too — a
 * drag-only control would put the funding order out of reach without a pointer.
 *
 * Reads and writes go exclusively through `GoalsStore`; the component imports no repository.
 */
@Component({
  selector: 'app-goals-panel',
  imports: [
    DragDropModule,
    NgIcon,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    FlexComponent,
    GoalFormComponent,
    GoalRowComponent,
    LoadingSkeletonComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './goals-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerPlus, tablerTargetArrow })],
})
export class GoalsPanelComponent {
  protected readonly goalsStore = inject(GoalsStore);
  protected readonly privacyMode = inject(AppSettingsStore).privacyModeEnabled;

  protected readonly rows = computed<GoalRowVm[]>(() => {
    const goals = this.goalsStore.activeGoals();
    return goals.map((goal, index) => ({
      goal,
      amountLabel: formatCurrency(goal.targetAmount),
      metaLabel: [goal.targetDate && `Wanted by ${formatDate(goal.targetDate)}`, goal.note]
        .filter(Boolean)
        .join(' · '),
      isFirst: index === 0,
      isLast: index === goals.length - 1,
    }));
  });

  protected readonly formOpen = signal(false);
  protected readonly editingGoal = signal<SavingsGoal | null>(null);

  protected readonly deleteConfirm = createConfirmState<SavingsGoal>();
  protected readonly deleteMessage = computed(() =>
    this.deleteConfirm.pending()
      ? `“${this.deleteConfirm.pending()?.name}” will be removed from the plan. This cannot be undone.`
      : '',
  );

  protected openAddForm(): void {
    this.editingGoal.set(null);
    this.formOpen.set(true);
  }

  protected openEditForm(goal: SavingsGoal): void {
    this.editingGoal.set(goal);
    this.formOpen.set(true);
  }

  protected async saveGoal(value: GoalFormValue): Promise<void> {
    const editing = this.editingGoal();
    if (editing?.id != null) {
      await this.goalsStore.updateGoal(editing.id, value);
      return;
    }
    await this.goalsStore.addGoal({
      ...value,
      archived: false,
      createdAt: new Date().toISOString().slice(0, 10),
    });
  }

  /** The keyboard path to the funding order — the same writes a drag makes, one slot at a time. */
  protected moveGoal(goal: SavingsGoal, direction: 'up' | 'down'): void {
    if (goal.id == null) return;
    void this.goalsStore.reorder(goal.id, direction);
  }

  protected onDrop(event: CdkDragDrop<GoalRowVm[]>): void {
    const orderedIds = this.rows().map((row) => row.goal.id!);
    moveItemInArray(orderedIds, event.previousIndex, event.currentIndex);
    void this.goalsStore.setGoalOrder(orderedIds);
  }

  protected confirmDelete(goal: SavingsGoal): void {
    this.deleteConfirm.request(goal);
  }

  protected deleteConfirmed(): void {
    const target = this.deleteConfirm.confirm();
    if (target?.id != null) {
      void this.goalsStore.removeGoal(target.id);
    }
  }
}
