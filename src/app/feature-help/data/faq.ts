export type FaqEntry = {
  readonly question: string;
  readonly answer: string;
};

/**
 * Static FAQ content (TICKET-PUB-03) answering "why does it work this way" for behaviour that's
 * subtle by design. The privacy entry is self-contained rather than linking out to TICKET-PUB-04
 * (local-data & migration messaging) because PUB-04 hasn't shipped yet — update it to link out
 * once it does, per PUB-03's own Notes.
 */
export const FAQ_ENTRIES: readonly FaqEntry[] = [
  {
    question: 'Why did my net worth change when my partner spent money from our joint account?',
    answer:
      'Joint accounts track what you actually contributed, not a flat share of the balance. Your stake is your own deposits and income into the account, minus your share of what the account spends — so your partner\'s spending can reduce your net worth exactly like your own spending would, rather than being averaged away. One side effect: if your partner spends before matching your contribution, it can briefly look like the pot "owes" you — that\'s expected, not a bug.',
  },
  {
    question: 'How exactly do joint accounts, ownership shares, and co-owners work?',
    answer:
      'Each joint account has an ownership share — your percentage of what the account spends. Leave it unset and the account behaves exactly like a personal one (100% yours); set it to, say, 50%, and only half of every outgoing payment counts against your stake, while the whole payment still leaves the account\'s raw balance. You can also register co-owners with the IBAN(s) they pay in from: a deposit from a registered co-owner\'s IBAN is auto-tagged "Partner contribution" (a neutral category) — it still moves the account balance and your net worth, but never counts as income, expense, or shows up in a category breakdown, and it\'s never mistaken for your own money. A deposit from one of your own accounts still counts as your income in full. Your overall stake in the account is: your deposits and income into it (at 100%) minus your ownership share of what it spends — not a fixed cut of the balance, which is why it can diverge from "balance ÷ number of owners" over time.',
  },
  {
    question: 'I fronted a joint expense from my personal account — how do I fix the numbers?',
    answer:
      'Edit that transaction and set its Attribution to "Shared (my share)" (this control only appears once you have a joint account) — it then counts at your ownership share instead of the default 100%, matching how it would have counted if paid straight from the joint account. If the joint account later paid you back, pick that reimbursement transfer in the same control: both legs of the repayment are then excluded from net worth and income/expense entirely, so the expense and your net worth agree on the same, share-weighted number instead of double-counting the repayment. The same control also covers the reverse cases — "Personal (100% mine)" for a personal expense accidentally paid from the joint account, and "Not mine (0%)" for a co-owner\'s personal expense paid from it — without changing the transaction\'s category or its real amount.',
  },
  {
    question:
      "Why were two transactions linked as a transfer automatically — and how do I undo it if it's wrong?",
    answer:
      'Money moving between your own accounts is detected automatically so it doesn\'t get double-counted as both an expense and income. A same-IBAN match links instantly; a less certain match waits in the Transactions page\'s "Review possible transfers" panel for you to confirm. If a pairing is wrong, use the "Unlink transfer" action on that transaction\'s row — both sides go back to being ordinary, unlinked transactions.',
  },
  {
    question: "I set a transaction's category manually — why didn't a new rule change it?",
    answer:
      "A category you set by hand is protected — rules (and the auto-categorisation suggestions) never overwrite it, even if you add a new rule afterwards that would otherwise match. This is deliberate: a manual correction is treated as more authoritative than an automated one. If you want a rule to take over again, change the transaction's category yourself first.",
  },
  {
    question: 'How does the auto-categorisation model actually work?',
    answer:
      'It\'s a small model trained entirely on-device, in a background worker, using only your own already-categorised transactions — nothing is ever uploaded to train it. It needs a minimum amount of your own history first (at least 25 categorised transactions across at least 2 categories) before it can train at all, and you can limit training to a recent window (e.g. the last 1-2 years) instead of your whole history. Once trained, it only ever suggests a category with a confidence percentage next to each uncategorised transaction — you accept or dismiss each one yourself, it never assigns anything on its own. When enough of its confident suggestions cluster around the same counterparty and category, it also proposes turning that pattern into a real rule, so repeat merchants stop needing a suggestion every time. Adding, renaming, or removing a category marks the model "stale" until you retrain it, since its learned categories no longer match yours exactly.',
  },
  {
    question: 'Is my data ever sent anywhere?',
    answer:
      "No. Money Mosaic has no backend — everything you import or enter lives only in your browser's own local database (IndexedDB). Nothing is uploaded, synced, or shared, and there's no account to sign into. That also means your data only exists on the device and browser you used to import it — back it up from the Data page (full JSON export/import) if you ever switch browsers or devices.",
  },
];
