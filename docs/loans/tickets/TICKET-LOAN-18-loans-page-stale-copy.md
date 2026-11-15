# TICKET-LOAN-18 — The loans page no longer says loan tracking is "on its way"

- **Area:** Loans
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-36, part ([code review 6](../../releases/v3_code_review_2/code-review.md)); FR-LOAN-2 (loans page), FR-LOAN-6 (overview cards)

## User story

As someone opening the Loans page for the first time, I want the empty state to say what to do now, so I don't think the feature hasn't shipped yet.

## Description

The empty state still carries the placeholder from before the loan tracker shipped in v1.7. It announces the feature as coming soon, although everything it promises already works.

## Current situation (as-is)

- [`loans-overview.component.html`](../../../src/app/feature-loans/components/loans-overview/loans-overview.component.html) lines 8–14: when `loanCards()` is empty, the page shows `mm-empty-state` with the title **"Loan tracking is on its way"** and the message "Payoff progress, amortization schedules, and balance charts for every loan you track will appear here. Add your first loan to get started."
- The only "Add loan" button is in the page header. The empty state has no action of its own, unlike the Future page's "Nothing planned yet" state, which carries an "Add goal" button.

## Desired result (to-be)

- The empty state's title says there are no loans yet (for example "No loans tracked yet"). The message says what tracking a loan gives you, in the present tense.
- The empty state carries an "Add loan" button that opens the same form as the header button (`openAddForm()`), as the goals panel does.

## Acceptance criteria

- [ ] With no loans, `/loans` shows no "on its way" or other future-tense copy.
- [ ] The empty state's "Add loan" button opens the add-loan form, and saving a loan replaces the empty state with its card.
- [ ] A component spec asserts the new title and that the empty state's button opens the form.
- [ ] `ng lint`, `ng test` and `ng build --configuration development` pass. Verified via the fallow skill and coding-conventions skill.
- [ ] Browser check: on an account with no loans, `/loans` shows the new empty state, and its button opens the form.

## Notes

- The other half of CR6-36, the data-management page's storage copy, is TICKET-DAT-06.
- Until TICKET-LOAN-19 lands, this empty state also flashes while loans are still loading. That's LOAN-19's job, not this ticket's.
