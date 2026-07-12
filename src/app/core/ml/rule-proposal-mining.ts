import type { Rule, Transaction } from '@/core/data-access';
import { matchesRule } from '@/core/categorisation';

export type Prediction = { transactionId: number; categoryId: number; confidence: number };

export type RuleProposal = {
  counterpartyName: string;
  categoryId: number;
  /** Cluster size. */
  support: number;
  meanConfidence: number;
  /** Representative transaction for `createRuleFromCounterparty`. */
  sampleTransactionId: number;
  /** Every cluster member, so a caller can show exactly which transactions would match. */
  transactionIds: number[];
};

type ClusterMember = { transaction: Transaction; prediction: Prediction };

const modalCategoryId = (members: ClusterMember[]): number => {
  const counts = new Map<number, number>();
  for (const member of members) {
    counts.set(member.prediction.categoryId, (counts.get(member.prediction.categoryId) ?? 0) + 1);
  }

  let best: { categoryId: number; count: number } | undefined;
  for (const [categoryId, count] of counts) {
    if (!best || count > best.count || (count === best.count && categoryId < best.categoryId)) {
      best = { categoryId, count };
    }
  }
  return best!.categoryId;
};

/**
 * Groups predictions by raw `counterpartyName` and proposes a rule for any cluster large and
 * confident enough, and not already fully covered by an existing enabled rule (FR-ML-3). Reuses
 * `matchesRule` rather than reimplementing coverage checks, so a mined proposal can never
 * disagree with the rules engine about what an enabled rule already catches.
 */
export const mineRuleProposals = (
  predictions: Prediction[],
  transactionsById: Map<number, Transaction>,
  enabledRules: Rule[],
  thresholds: { minSupport: number; minConfidence: number },
): RuleProposal[] => {
  const clusters = new Map<string, ClusterMember[]>();

  for (const prediction of predictions) {
    const transaction = transactionsById.get(prediction.transactionId);
    const counterpartyName = transaction?.counterpartyName?.trim();
    if (!transaction || !counterpartyName) continue;

    const members = clusters.get(counterpartyName) ?? [];
    members.push({ transaction, prediction });
    clusters.set(counterpartyName, members);
  }

  const proposals: RuleProposal[] = [];

  for (const [counterpartyName, members] of clusters) {
    const support = members.length;
    const meanConfidence =
      members.reduce((sum, member) => sum + member.prediction.confidence, 0) / support;

    if (support < thresholds.minSupport || meanConfidence < thresholds.minConfidence) continue;

    const fullyCovered = members.every((member) =>
      enabledRules.some((rule) => matchesRule(member.transaction, rule)),
    );
    if (fullyCovered) continue;

    proposals.push({
      counterpartyName,
      categoryId: modalCategoryId(members),
      support,
      meanConfidence,
      sampleTransactionId: members[0].transaction.id!,
      transactionIds: members.map((member) => member.transaction.id!),
    });
  }

  return proposals.sort((a, b) => b.support - a.support || b.meanConfidence - a.meanConfidence);
};
