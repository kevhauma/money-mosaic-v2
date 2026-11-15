# TICKET-SRV-23 — Restore handles a loan whose category is gone

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** FR-DAT-2 (import a backup), FR-LOAN-1; CR6-5, part ([code review](../../releases/v3_code_review_2/code-review.md))

## User story

As someone restoring a backup made by the old browser-only app, I want to be told exactly which loan is the problem when its category no longer exists, so I can fix it instead of staring at a generic refusal.

## Description

The old app let you delete a category a loan was tracking and left the loan pointing at nothing. A backup carrying such a loan is refused today with the same generic message as any other broken reference, which doesn't say which loan is at fault. This ticket names the loan.

## Current situation (as-is)

- `loans.categoryId` is a `NOT NULL` hard foreign key with no `onDelete` ([`loans.ts`](../../../server/src/schema/loans.ts) lines 54–56). The comment at lines 20–25 names this orphan path: the old `removeCategory` never looked at loans.
- `importDocument` in [`data.ts`](../../../server/src/routes/data.ts) (lines 319–329) catches the failure from `assertReferencesOwned` and answers 400 "…a row in "loans" references a row that is not in the backup, or belongs to another account. Nothing was imported." The loan isn't named.

## Desired result (to-be)

- The loan is refused, not dropped. The 400 names the loan(s) and says the category is missing, e.g. `This backup cannot be imported: the loan "Car loan" tracks a category that is not in the backup. Nothing was imported.`
- The check runs inside the import transaction, after the writes, like the existing reference check. Nothing is written.
- Every other dangling hard reference keeps the existing generic refusal.

## Acceptance criteria

- [ ] A backup with a loan whose `categoryId` isn't in it answers 400 with the loan's name in the message and writes nothing. (`data.spec.ts` → new case "refuses a loan whose category is not in the backup, naming the loan".)
- [ ] The same answer comes back when that category id belongs to **another user**, and that user's rows are untouched.
- [ ] A loan whose category is in the backup, including one renumbered by `planImportIds`, still restores.
- [ ] `npm run test:server`, `npm --prefix server run lint` and `npm --prefix server run typecheck` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Why refuse rather than drop:** dropping a loan silently throws away its name, principal, rate and term, and `loans.ts` already rejects CASCADE for that reason. Keeping it is impossible because `categoryId` is `NOT NULL`. A named refusal lets the user fix the backup or re-create the loan. Drop-and-report would need a response body to report in, and the import answers 204 today. Confirm the choice when picking this up.
- Sequenced after [TICKET-SRV-15](./TICKET-SRV-15-restore-prunes-orphan-transfers-by-ownership.md), which touches the same post-write step.
- The CR6 finding is marked _likely_ (not reproduced); the code path above is confirmed.
