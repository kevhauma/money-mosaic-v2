# TICKET-EXP-06 — Money flow reads account balances, and shows transfers between own accounts

- **Area:** Explore
- **Released in:** [v2.1 Extra graphs](../../releases/v2.1_extra_graphs/overview.md)
- **Type:** Refactor (behaviour change) — from feedback on the shipped diagram
- **Traceability:** revises **FR-EXP-2** ([TICKET-EXP-02](./TICKET-EXP-02-money-flow-sankey.md), extended by [EXP-03](./TICKET-EXP-03-sankey-category-group-level.md) and [EXP-04](./TICKET-EXP-04-sankey-tooltips-drilldown-privacy.md)). **Reverses EXP-02's decision to route every per-transaction decision through `classifyForStats`** — see "Why the reversal" below.

## User story

As someone with a joint account, I want the money flow diagram to show what actually moved through my accounts — including the transfer that funded the joint account and my partner's contribution into it — so the picture matches my bank statements rather than my share of them.

## Description

Two changes that turn out to be one idea. The diagram now reads **account balances rather than net
worth**: every amount at face value, no ownership weighting, no exclusions beyond "this wasn't a
movement". And because own-account transfers are movements, they are now drawn — which needs a
second account tier, since a Sankey link must run downhill and two accounts in one column cannot be
joined.

## Current situation (as-is)

- `computeMoneyFlowGraph` routes every transaction through `classifyForStats`, which answers a
  *net-worth* question: a joint account's spending is weighted by `ownershipShare`, a co-owner's
  contribution is dropped (`coOwnerIn`), `neutral` categories are excluded, and a refund nets its
  category down rather than appearing as money arriving.
- `classifyForStats` returns `skip` for a linked own-account transfer, so **a checking → joint
  transfer draws nothing at all**. Worse, the joint account's spending then has no visible funding,
  so the balancing pass invents a "money from before the range" ribbon for it — actively
  misattributing money that arrived this period as money held before it.
- Savings accounts are modelled twice: as a terminal `savings:<id>` destination node, and again as
  an ordinary `account:<id>` node whenever they spend outward.
- All accounts share one level, and every link spans exactly one level.

## Desired result (to-be)

### Classification: account balance, not net worth

- The aggregate no longer calls `classifyForStats`. Its own rule is the sign of the amount, and its
  only exclusions are the ones that aren't movements: out of range, `nullified`, zero amount.
- No `ownershipShare` weighting — a joint account's €400 spend is a €400 ribbon.
- `neutral` categories are included, so a partner's contribution is a real income source.
- No payback/refund netting: money coming back in is drawn as money coming in, from that category.
- Consequence, stated rather than hidden: **the Dashboard and this diagram will not agree on a joint
  account**, because they answer different questions. Documented on the function and in the panel.

### Account tiers and transfers

- `checking` accounts sit on tier 1; `joint`, `savings` and `invest` on tier 2.
- A movement whose counterparty IBAN matches another own account is drawn as an `account → account`
  ribbon, resolved the same way savings destinations already were — **from the shallower leg only**,
  so a linked pair produces one ribbon rather than two opposing ones, and money moving back up nets
  that same ribbon down instead of drawing an uphill link.
- A savings account is now just an account: one node, which can receive a transfer and spend outward.
  The `savings` node kind and its `savings:other` fallback are gone.
- Levels become: sources 0 → primary accounts 1 → secondary accounts 2 → destinations 3 → grouped
  categories 4. **Links run strictly downhill rather than exactly one level** — an ordinary purchase
  from a checking account runs 1 → 3 — which is the property that actually guarantees acyclicity.
- A movement between two accounts on the *same* tier cannot be drawn at all (one column, and a
  same-column link is a cycle). Counted as `sameTierTransferCount` and stated in the panel.

### Readability

- The chart's height scales with its busiest column, `nodeGap` widens so small nodes' labels stop
  colliding, `layoutIterations` rises so the crossing-minimisation has room to untangle multi-column
  links, and the right margin reserves space for the last column's labels, which were being clipped.
- **"Carried in" is renamed "Existing balance"**, and the panel now carries a line explaining the two
  synthetic ribbons. Reported in the same round of feedback: with every real income source
  categorised, a node standing for money from before the range reads as an unexplained *source*
  rather than as a balance fact. The internal id and `FlowNodeKind` are renamed to match
  (`existing-balance`), rather than leaving a `CARRIED_IN` identifier rendering different words.
- Only the ribbon actually drawn is explained — a range where nothing was left over does not carry a
  sentence about leftovers.

## Acceptance criteria

- [x] `computeMoneyFlowGraph` no longer imports or calls `classifyForStats`; its exclusions are range, `nullified` and zero amount only. (`money-flow-graph.ts` — the file's only imports are the entity types and `normalizeIban`; spec `leaves out a nullified row and a zero-amount row, which are not movements at all`)
- [x] A joint account's spending is drawn at face value, not weighted by `ownershipShare`. (spec `shows a joint account's spending at face value, not weighted by ownershipShare` — €400 spend on a 50%-owned account draws €400)
- [x] A `neutral`-category contribution appears as a real income source. (spec `includes a partner's neutral-category contribution as a real income source`)
- [x] A refund appears as money arriving from that category, not as its expense ribbon netting down. (spec `shows a refund as money arriving, not as its category netting down`)
- [x] Each account's imbalance equals its balance change over the range. (spec `makes each account's imbalance exactly its balance change over the range`)
- [x] `checking` sits on tier 1; `joint`/`savings`/`invest` on tier 2. (spec `puts everyday accounts on tier 1 and joint/savings/investment accounts on tier 2`)
- [x] A checking → joint transfer is drawn as a ribbon between the two accounts, and the joint account's spending is no longer funded by a phantom `existing-balance` ribbon. (spec `draws a checking → joint transfer as a ribbon between the two accounts`)
- [x] A linked transfer draws once, from the shallower leg — never as two opposing ribbons. (spec `draws a linked transfer once, from the shallower leg, never as two opposing ribbons`)
- [x] Money moving back up nets the existing ribbon down rather than drawing an uphill link, and a full round trip drops it and counts the drop. (specs `nets the ribbon down when money moves back up, instead of drawing an uphill link` and `drops a transfer ribbon that fully round-tripped, and counts the drop`)
- [x] A same-tier movement is counted, not silently dropped, and the panel says so. (aggregate spec `counts, rather than silently drops, a movement between two accounts on the same tier`; panel spec `says so when a transfer runs between two accounts of the same kind, which it cannot draw`)
- [x] A savings account is one node that can both receive a transfer and spend outward. (spec `spends from a savings account as an ordinary outflow, with one node per account`)
- [x] Every link runs strictly downhill, with and without category grouping. (specs `emits every link strictly downhill, so the graph is acyclic by construction` and `still runs strictly downhill with grouping on, alongside an account-to-account transfer`)
- [x] EXP-03's "every total identical with grouping on and off" still holds under the new model. (spec `keeps every total identical with grouping on and off — the property the level must not break`)
- [x] The "Carried in" node is renamed "Existing balance", id and kind included, with no stale `CARRIED_IN` vocabulary left behind. (`EXISTING_BALANCE_NODE_ID` / `kind: 'existing-balance'` in `money-flow-graph.ts`; `grep -rn "carried.in" src/app` returns nothing)
- [x] The panel explains the synthetic ribbons, and only the one it drew. (`balanceNodesNote`; specs `explains the left-over ribbon, and stays quiet about the one it did not draw` and `explains the existing-balance ribbon when an account spends without taking anything in`. Observed live on `/explore`: "This month" shows only the Left over sentence, "This week" — which has no salary in range — shows only the Existing balance one, above a diagram whose entire €1,085.59 of spending flows from that node.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (lint clean; 237 files / 2463 tests passed; build complete)
- [ ] Verified live in the browser against a dataset with a joint account and category grouping on — the density case the feedback came from. **Open**: checked on the dev profile (2 accounts), where the tiering, the checking → savings transfer ribbon, the small-node label separation and the un-clipped right column all render correctly; the reporter's own richer dataset has not been re-checked.

## Notes

- **Why the reversal.** EXP-02 made "every per-transaction decision routes through
  `classifyForStats`" a load-bearing criterion, so that a ribbon could never disagree with a
  Dashboard stat card. That guarantee is the wrong one for this diagram. `classifyForStats` answers
  "what did this contribute to *my* income, expense and savings" — a net-worth question — and every
  one of its adjustments (ownership weighting, dropping co-owner money, dropping `neutral`, netting
  refunds) removes something that genuinely moved through the account. The Sankey's job is to show
  the plumbing, so the two must be allowed to differ, and the difference is now documented on both
  sides rather than engineered away.
- **Why the shallower leg only.** This mirrors `isSavingsMovement`'s existing rule exactly: it fires
  on the leg whose *counterparty* is the deeper account, never on the deeper account's own leg, so a
  linked pair can't be counted twice. The known cost, unchanged from that precedent: a movement
  imported on the deeper side only is not drawn.
- **Same-tier transfers are a real gap**, not an oversight — checking → checking has no valid Sankey
  geometry. If it becomes common, the fix is to promote an account to tier 2 only when a transfer
  actually reaches it from a shallower one, which would let two everyday accounts occupy different
  columns. Not built here because it makes an account's column data-dependent, and the reporter's
  case is funded transfers into a joint account, which this ticket draws.
- **Ribbons still cross columns.** A source paying straight into a joint account runs 0 → 2 and its
  ribbon passes over the tier-1 column; that is inherent to the tier design, not a layout bug. The
  readability work above reduces the collisions around it, but does not remove that crossing.
