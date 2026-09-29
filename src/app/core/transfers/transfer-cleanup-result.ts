/**
 * What removing a set of transactions did to the transfers that linked them.
 *
 * The cleanup itself is server-side (`server/src/operations/transfer-cleanup.ts`, ported in
 * TICKET-SRV-04): removing a transaction has to unpick every `Transfer` touching it and clear the
 * surviving leg's `transferId` in the same transaction, which no sequence of HTTP calls can promise.
 * What stayed on the client is this shape — `AccountsStore`, `TransactionsStore` and `TransfersStore`
 * each mirror one of its three lists, since a store cannot learn what cascaded any other way.
 */
export type TransferCleanupResult = {
  /** Transfer records removed because one side belonged to the removed transactions. */
  unlinkedTransferIds: number[];
  /** Surviving (not-removed) transactions whose transferId was cleared as a result. */
  clearedTransferTransactionIds: number[];
};

export type RemoveTransactionsWithCleanupResult = TransferCleanupResult & {
  /** Transactions actually removed. Ids that matched no row of the caller's are absent. */
  removedTransactionIds: number[];
};
