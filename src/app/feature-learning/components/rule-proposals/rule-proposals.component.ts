import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerChevronDown, tablerChevronUp } from '@ng-icons/tabler-icons';
import type { Transaction } from '@/core/data-access';
import type { RuleProposal } from '@/core/ml';
import { CategoryModelStore } from '@/feature-categories';
import { CategoriesStore, TransactionsStore } from '@/core/state';
import { BadgeComponent, ButtonComponent } from '@/shared/ui';
import { SignedAmountPipe } from '@/shared/utils';

/** Rule-proposal inbox on the Learning page (FR-ML-9) — a thin UI consumer of `CategoryModelStore` (ML-07). */
@Component({
  selector: 'app-rule-proposals',
  imports: [NgIcon, SignedAmountPipe, BadgeComponent, ButtonComponent],
  templateUrl: './rule-proposals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerChevronDown, tablerChevronUp })],
})
export class RuleProposalsComponent {
  protected readonly categoryModelStore = inject(CategoryModelStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly transactionsStore = inject(TransactionsStore);

  /** Counterparty names currently expanded to show their matched transactions. */
  private readonly expandedCounterparties = signal(new Set<string>());

  protected categoryNameFor(proposal: RuleProposal): string {
    return (
      this.categoriesStore.categoriesById().get(proposal.categoryId)?.name ?? 'Unknown category'
    );
  }

  protected confidencePercent(proposal: RuleProposal): number {
    return Math.round(proposal.meanConfidence * 100);
  }

  protected isExpanded(proposal: RuleProposal): boolean {
    return this.expandedCounterparties().has(proposal.counterpartyName);
  }

  protected toggleExpanded(proposal: RuleProposal): void {
    const expanded = new Set(this.expandedCounterparties());
    if (!expanded.delete(proposal.counterpartyName)) {
      expanded.add(proposal.counterpartyName);
    }
    this.expandedCounterparties.set(expanded);
  }

  protected matchedTransactions(proposal: RuleProposal): Transaction[] {
    const ids = new Set(proposal.transactionIds);
    return this.transactionsStore
      .transactions()
      .filter((transaction) => ids.has(transaction.id!))
      .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));
  }

  protected accept(proposal: RuleProposal): void {
    void this.categoryModelStore.acceptProposal(proposal);
  }

  protected dismiss(proposal: RuleProposal): void {
    this.categoryModelStore.dismissProposal(proposal);
  }
}
