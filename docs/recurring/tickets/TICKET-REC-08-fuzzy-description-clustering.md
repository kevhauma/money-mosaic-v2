# TICKET-REC-08 — A card payment whose description carries a terminal ID still clusters with itself

- **Area:** Recurring
- **Released in:** [v2.1 Extra graphs](../../releases/v2.1_extra_graphs/overview.md)
- **Type:** Bug fix
- **Traceability:** revises **FR-REC-1** (detection), surfaces through **FR-REC-2/3**. From feedback
  on the shipped panel: "in my real data set, there are many monthly and weekly payments that
  aren't being detected".

## User story

As someone whose bank writes a different reference into every card payment, I want payments at the
same place to be recognised as the same place, so my real recurring costs are detected instead of
being scattered into one-off transactions that never reach the occurrence threshold.

## Description

Detection groups occurrences by counterparty using **exact** string equality on the strongest
available key, and the weakest key — the raw description — is exactly the one real bank exports fill
with noise: terminal IDs, sequence numbers, cities, dates. Twelve monthly payments at one merchant
become twelve clusters of one, each below `MIN_OCCURRENCES`, and nothing is detected. This ticket
makes that last-resort tier match on **token overlap** instead of exact equality.

## Current situation (as-is)

- `clusterIdentity` ([recurring-payments.ts](../../../src/app/core/stats/recurring-payments.ts)) picks
  one key per transaction, strongest signal first: `iban:<normalized>` → `name:<normalized>` →
  `desc:<normalized>`. `candidatesByCounterparty` then groups on that key with a plain `Map`, so
  grouping is exact string equality.
- `normalizeText` only lowercases and collapses whitespace. It cannot help with
  `CARD PMT 4429 ALBERT HEIJN 1183 AMSTERDAM 12/07` versus
  `CARD PMT 7781 ALBERT HEIJN 2094 UTRECHT 26/07` — two payments at one supermarket, two clusters.
- The consequence is silent and compounding: a cluster of one never reaches `MIN_OCCURRENCES = 3`,
  so it is dropped by `toSeries` before amount banding or cadence recognition is even attempted.
  Nothing in the UI distinguishes "no rhythm here" from "never grouped in the first place".
- The `iban:` and `name:` tiers do **not** have this problem to the same degree — an IBAN is an exact
  identifier and a counterparty name is usually stable — which is why this ticket narrows to the
  `desc:` tier only.

## Desired result (to-be)

- **The `desc:` tier clusters by similarity, not equality.** Two description-keyed transactions join
  the same cluster when their descriptions score at or above a named threshold; `iban:` and `name:`
  keep exact-equality grouping untouched.
- **Token overlap, not edit distance.** The normalized description is split into tokens;
  **pure-numeric and date-shaped tokens are dropped** (they are the noise — terminal IDs, sequence
  numbers, booking dates); the score is the Sørensen–Dice coefficient over the remaining token
  *sets*, `2 × |A ∩ B| / (|A| + |B|)`. This is chosen over a whole-string edit-distance ratio
  precisely because bank boilerplate (`SEPA DIRECT DEBIT REF …`) makes two *different* payees look
  character-identical while their distinguishing token differs.
- **`DESCRIPTION_MATCH_THRESHOLD = 0.8`** — a named, doc-commented constant, stated as a starting
  point that is expected to be tuned against real data.
- **Deterministic and near-linear.** Assignment is greedy in input order: a transaction joins the
  first existing description cluster it scores at or above the threshold against, otherwise it opens
  a new one. Candidate clusters are found through an inverted token → cluster index so only clusters
  sharing at least one token are ever scored — never an all-pairs sweep, because this aggregate is
  uncached and re-runs on every read (the `bandByAmount` performance note records the same
  constraint).
- A cluster whose token set is **empty** after the numeric/date filter (a description that is nothing
  but a reference number) falls back to exact-equality grouping rather than matching everything.
- Everything downstream is unchanged: amount banding, `MIN_OCCURRENCES`, cadence recognition and the
  REC-04 flags all see the same shapes they see today, just with fuller clusters.

## Acceptance criteria

- [x] Two description-keyed transactions whose descriptions differ only in a terminal ID, a city and
      a date cluster together, and three of them at a similar amount on a monthly rhythm produce one
      detected series. (`recurring-payments.spec.ts` → "clusters card payments that differ only in a
      terminal ID, a city and a date" — the three `ALBERT HEIJN` rows become one monthly series of
      three occurrences at €45.)
- [x] Two descriptions sharing only boilerplate (`SEPA DD … NL92` with a different payee token) score
      below the threshold and stay in separate clusters — no false merge. (`recurring-payments.spec.ts`
      → "keeps two payees apart when all they share is bank boilerplate": Dice 0.60, two monthly
      series rather than the one fortnightly series a merge would have produced.)
- [x] `DESCRIPTION_MATCH_THRESHOLD` is a named, doc-commented constant per the aggregate's
      convention, and the tokeniser's numeric/date-token exclusion is doc-commented with its reason.
      (`recurring-payments.ts` — the constant carries the "starting point, err high when tuning" note;
      `descriptionTokens` documents why numeric tokens go and that dates decompose into them.)
- [x] The `iban:` and `name:` tiers still group by exact equality — a fuzzy name match never merges
      two payees, and every existing REC-01…07 spec passes unchanged. (`exactClusterIdentity` is the
      untouched IBAN→name ladder; `recurring-payments.spec.ts` → "leaves the name and IBAN tiers on
      exact equality, however alike they look" uses a name pair scoring ≈0.86 and still gets two
      series. All 39 specs in the file pass, the 33 pre-existing ones unmodified.)
- [x] A description that tokenises to nothing (pure reference number) does not become a bucket that
      swallows unrelated transactions. (`recurring-payments.spec.ts` → "does not let a description
      that tokenises to nothing swallow unrelated payments" — two number-only references stay two
      series of three; `exactCluster` keys them by exact equality and never enters the token index.)
- [x] Clustering is deterministic: detection over the same transactions in the same order returns
      identical `series[].key` values across repeated calls, so `key` stays safe as a render key.
      (`recurring-payments.spec.ts` → "returns the same series keys on every run" — two runs compared,
      plus the literal `desc:card pmt 4429 albert heijn 1183 amsterdam 12/05|45.00`.)
- [x] Candidate lookup goes through a token index, not an all-pairs comparison; a cluster with
      hundreds of card payments does not degrade detection to O(n²). (`candidatesFor` in
      `recurring-payments.ts` reads the `byToken` inverted index and `firstMatch` short-circuits on
      the first match, so the many-payments-at-one-merchant case is one Dice comparison per
      transaction. Structural, read off the code — no timing test, which would only be flaky.)
- [x] The aggregate stays pure and clock-free (`todayIso` parameter only); no Dexie change, no store
      or repository touched. (`git diff --stat` for this change: `recurring-payments.ts` +
      `recurring-payments.spec.ts` only; the clusterer is created per call inside
      `candidatesByCounterparty`, holding no state between runs.)
- [x] Unit tests cover: the terminal-ID/city/date merge; the boilerplate non-merge; the empty-token
      fallback; threshold boundary behaviour (just above and just below 0.8); determinism of `key`
      across repeated detection; and that an IBAN-keyed and a name-keyed cluster are unaffected.
      (Six specs under `describe('detectRecurringPayments: fuzzy description clustering
      (TICKET-REC-08)')`. The boundary spec pairs the inclusive 0.80 case with 0.75 rather than a
      "just above" one: 0.80 *is* the merge boundary, so 0.80-merges/0.75-does-not is what pins it.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass. (Lint clean; 2614
      tests in 243 files pass; dev build completes.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD` →
      verdict `pass`, 0 introduced findings of any kind. The first pass introduced one
      over-threshold function; `firstMatch` was split into `candidatesFor` + `find` to clear it.)
- [ ] Verified live in the browser against the reporter's own dataset: payments that were previously
      undetected appear in the panel on `/explore`, and no two visibly different payees have been
      merged into one series. — **not done: the live browser check was waived by the user for this
      ticket.** The threshold is untuned against real data as a result (see Notes).

## Notes

- **0.8 is a starting point, not a finding.** The threshold was chosen before seeing the reporter's
  data. Expect to tune it; the acceptance criteria deliberately test the boundary rather than assert
  a particular real-world outcome.
- **False merges are the expensive failure, not missed merges.** A missed merge leaves the status
  quo (a payment not detected); a false merge invents a commitment the user does not have, and
  `bandByAmount`/`recogniseCadence` will happily find a plausible rhythm inside a mixed cluster.
  When tuning, err high.
- `series.key` is `<clusterKey>|<amount>`, so the fuzzy cluster needs a stable representative
  description for its key — the first transaction to open the cluster, in input order.
- Interacts with [TICKET-REC-09](./TICKET-REC-09-recurring-includes-joint-accounts.md) only by
  touching the same aggregate; the two are independent and can ship in either order.
- Not in scope: fuzzy-matching the `name:` tier. Considered and deliberately deferred — it is a
  larger blast radius (a name is a stronger signal, so a false merge there is more surprising) and
  the reporter's problem is described as descriptions.
