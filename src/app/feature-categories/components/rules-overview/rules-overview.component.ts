import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { AccountsStore, CategoriesStore } from '@/core/state';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  LoadingSkeletonComponent,
  PageHeaderComponent,
  TabsComponent,
  type TabDefinition,
} from '@/shared/ui';
import { createSelectionModel } from '@/shared/utils';
import { RulesStore } from '../../rules.store';
import { describeRule } from '../../rule-summary';
import { matchesRuleFilters, type RuleFilters } from '../../rule-filters';
import { RuleFiltersComponent } from '../rule-filters/rule-filters.component';
import { RuleFormComponent, type RuleFormValue } from '../rule-form/rule-form.component';
import { RuleShareBarComponent } from '../rule-share-bar/rule-share-bar.component';

const CATEGORIES_TABS: TabDefinition[] = [
  { label: 'Categories', value: 'categories', link: '/categories', exact: true },
  { label: 'Rules', value: 'rules', link: '/categories/rules' },
];

@Component({
  selector: 'app-rules-overview',
  imports: [
    NgIcon,
    RuleFiltersComponent,
    RuleFormComponent,
    RuleShareBarComponent,
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    TabsComponent,
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
  protected readonly categoriesTabs = CATEGORIES_TABS;

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

  protected readonly filters = signal<RuleFilters>({ text: '', categoryId: '', enabled: '' });

  /** Row selection for rule sharing (TICKET-CAT-06) — passed down to `app-rule-share-bar`. */
  protected readonly selection = createSelectionModel<number>();

  /** True while any search/filter axis is active (TICKET-CAT-04). */
  protected readonly filtersActive = computed(
    () =>
      this.filters().text !== '' ||
      this.filters().categoryId !== '' ||
      this.filters().enabled !== '',
  );

  /**
   * `moveRule` swaps priority with the neighbour in the full, unfiltered `rulesByPriority()`
   * list — while a filter hides rows in between, "move up/down" would jump across them in a
   * confusing way. Reordering is disabled while any filter is active rather than trying to
   * scope it to the filtered view (TICKET-CAT-04).
   */
  protected readonly filteredRules = computed(() =>
    this.rulesStore
      .rulesByPriority()
      .filter((rule) => matchesRuleFilters(rule, this.filters(), this.resolveAccountName)),
  );

  private readonly filteredIds = computed(() => this.filteredRules().map((rule) => rule.id!));

  /** Whether every currently-filtered rule is selected — drives the header checkbox's own state. */
  protected readonly allFilteredSelected = computed(() =>
    this.selection.allSelected(this.filteredIds()),
  );

  /** Drives the header checkbox's indeterminate state: some, but not all, filtered rows selected. */
  protected readonly someFilteredSelected = computed(() =>
    this.selection.someSelected(this.filteredIds()),
  );

  /** Plain array view of the selection for `app-rule-share-bar`'s `selectedIds` input (TICKET-CAT-06). */
  protected readonly selectedIdsList = computed(() => [...this.selection.selectedIds()]);

  protected onFiltersChange(filters: RuleFilters): void {
    this.filters.set(filters);
  }

  private readonly resolveAccountName = (accountId: number): string =>
    this.accountsStore.accounts().find((account) => account.id === accountId)?.name ??
    `#${accountId}`;

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
    return describeRule(rule, this.resolveAccountName);
  }

  protected async runRules(): Promise<void> {
    this.running.set(true);
    try {
      await this.rulesStore.runRules();
    } finally {
      this.running.set(false);
    }
  }

  /** Header checkbox: collapse to none if every filtered rule is already selected, otherwise select them all. */
  protected toggleSelectAllFiltered(): void {
    if (this.allFilteredSelected()) {
      this.selection.clear();
    } else {
      this.selection.selectAll(this.filteredIds());
    }
  }
}
