import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerChevronDown,
  tablerChevronUp,
  tablerPencil,
  tablerPlus,
  tablerRefresh,
  tablerTrash,
} from '@ng-icons/tabler-icons';
import type { Rule } from '@/core/data-access';
import { AccountsStore } from '@/feature-accounts';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  PageHeaderComponent,
} from '@/shared/ui';
import { CategoriesStore } from '../../categories.store';
import { RulesStore } from '../../rules.store';
import { describeRule } from '../../rule-summary';
import { RuleFormComponent, type RuleFormValue } from '../rule-form/rule-form.component';
import { RuleProposalsComponent } from '../rule-proposals/rule-proposals.component';

@Component({
  selector: 'app-rules-overview',
  imports: [
    RouterLink,
    RouterLinkActive,
    NgIcon,
    RuleFormComponent,
    RuleProposalsComponent,
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    PageHeaderComponent,
  ],
  templateUrl: './rules-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      tablerPlus,
      tablerPencil,
      tablerTrash,
      tablerChevronUp,
      tablerChevronDown,
      tablerRefresh,
    }),
  ],
})
export class RulesOverviewComponent {
  protected readonly rulesStore = inject(RulesStore);
  protected readonly categoriesStore = inject(CategoriesStore);
  private readonly accountsStore = inject(AccountsStore);

  protected readonly formOpen = signal(false);
  protected readonly editingRule = signal<Rule | null>(null);

  protected readonly deleteConfirmOpen = signal(false);
  private readonly deleteTarget = signal<Rule | null>(null);

  protected readonly nextPriority = computed(
    () => Math.max(0, ...this.rulesStore.rules().map((rule) => rule.priority)) + 10,
  );

  protected readonly running = signal(false);

  protected openAddForm(): void {
    this.editingRule.set(null);
    this.formOpen.set(true);
  }

  protected openEditForm(rule: Rule): void {
    this.editingRule.set(rule);
    this.formOpen.set(true);
  }

  protected async saveRule(value: RuleFormValue): Promise<void> {
    const editing = this.editingRule();
    if (editing?.id != null) {
      await this.rulesStore.updateRule(editing.id, value);
    } else {
      await this.rulesStore.addRule(value);
    }
  }

  protected toggleEnabled(rule: Rule): void {
    void this.rulesStore.toggleEnabled(rule);
  }

  protected moveRule(rule: Rule, direction: 'up' | 'down'): void {
    void this.rulesStore.moveRule(rule, direction);
  }

  protected isFirst(rule: Rule): boolean {
    return this.rulesStore.rulesByPriority()[0]?.id === rule.id;
  }

  protected isLast(rule: Rule): boolean {
    const ordered = this.rulesStore.rulesByPriority();
    return ordered[ordered.length - 1]?.id === rule.id;
  }

  protected confirmDelete(rule: Rule): void {
    this.deleteTarget.set(rule);
    this.deleteConfirmOpen.set(true);
  }

  protected deleteConfirmed(): void {
    const target = this.deleteTarget();
    if (target?.id != null) {
      void this.rulesStore.removeRule(target.id);
    }
  }

  protected categoryNameFor(rule: Rule): string {
    return (
      this.categoriesStore.categoriesById().get(rule.action.setCategoryId)?.name ??
      'Unknown category'
    );
  }

  protected conditionSummary(rule: Rule): string {
    return describeRule(
      rule,
      (accountId) =>
        this.accountsStore.accounts().find((account) => account.id === accountId)?.name ??
        `#${accountId}`,
    );
  }

  protected async runRules(): Promise<void> {
    this.running.set(true);
    try {
      await this.rulesStore.runRules();
    } finally {
      this.running.set(false);
    }
  }
}
