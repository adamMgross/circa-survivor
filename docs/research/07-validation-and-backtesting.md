# Validation and backtesting

One season is one sample, and there have been four Circa Survivor seasons with published
data. No amount of statistics turns four realized outcome paths into evidence that a strategy
works. The way out is to validate the components, which have thousands of observations each,
and to evaluate the strategy on model-implied expected payout against the true historical
field rather than on what happened to happen.

## Validate the components, not the outcome

**Win probability.** Brier score and log loss on held-out games, per source and per de-vig
method, plus a reliability curve. Thousands of games. This settles the market-versus-models
question and the power-versus-Shin question in the same harness, and it is the first thing to
build because everything downstream inherits its error.

**Field behavior.** The model predicts a vector `n` and next week's availability file reports
the realized one. Multinomial log loss, walk-forward, one score per contest week. Roughly
sixteen scored weeks per season across three seasons. This is the measurement the current
hand-fit constants have never been subjected to, and it is the one most likely to change
somebody's mind.

**Continuation value.** Out-of-sample R-squared of the regression against realized payout on
held-out simulated paths, plus a self-consistency check that the fitted value at week `w`
matches a full forward simulation from week `w` within tolerance.

## Evaluate the strategy on expected payout, not realized payout

For every historical contest week where the inputs exist, reconstruct the decision state as
of the deadline and replay.

```
inputs at the Saturday 4:00 PM PT deadline:
  odds snapshot from the historical odds archive
  the published availability file for that week
  the schedule and the rules as they stood

output:
  a pick per strategy

evaluation:
  E[payout] under the realized field composition and simulated game outcomes
```

Two deliberate choices in that evaluation.

**Use the realized field, not the modeled field.** When comparing strategies, feeding all of
them the true published `n` removes the field model's error from the comparison and isolates
the decision rule. Then run it a second time with the modeled field, and the difference is
the price of field-model error, reported separately.

**Simulate outcomes, do not use the realized one.** A strategy that is beaten by a coin flip
in one week should not be graded on that coin flip. Averaging over simulated outcomes under
the same probabilities every strategy saw gives a low-variance comparison. Report the
realized-outcome result too, clearly labeled as an anecdote.

## Benchmarks

Every one of these should be in the harness from the beginning, because a number without a
benchmark is not a result.

| Benchmark | Why it is there |
|---|---|
| Chalk | Highest available win probability. What most of the field does |
| Naive `a/p` | The folklore formula. `02-objective-function.md` predicts it loses |
| Jamie's current formula | The thing we are claiming to improve on |
| Survival-maximizing | The Bergman and Imbrogno objective, correct problem, wrong goal |
| Random feasible | The floor. If a strategy cannot beat this, stop |
| Proposed | `06-solution-methods.md` |

Report expected payout per entry in dollars, since every one of these is denominated in a
$25M pool and dollars are the unit the syndicate thinks in.

## What can go wrong, specifically

**Closing lines.** The single most likely way to produce a backtest that looks good and is
not real. The deadline is Saturday 4:00 PM PT. Historical snapshots exist. Use them.

**Hindsight in availability.** The availability file for week `w` is published before week
`w`'s deadline and is legitimate input. The file for week `w+1` is not. The parser should
carry the publication timestamp and the harness should refuse anything later than the
deadline.

**The eliminated entries are missing.** Availability files list survivors only, so the
losing side of each week is not directly recorded. It is partially recoverable: an entry
present in week `w` and absent in week `w+1` was eliminated in week `w`, and its pick must
have been a losing team that was available to it. Where exactly one losing team was
available, the pick is identified exactly. Where several were, the choice model can fill it
in by expectation-maximization. This is worth doing, because the eliminated entries are the
entire signal about which picks the field makes badly.

**Tuning on the test set.** The horizon `h`, the de-vig method, the field-model
specification, and the continuation-value features are all choices. Fit on 2024 and 2025,
hold 2026 out entirely, and count the variants tried. A backtest with twenty variants and no
correction is a search, not a test.

**Pre-register the rest of 2026.** Write the strategy and the benchmarks down before running
week 3, and score every remaining week as it happens. One season is still one sample, but a
pre-registered one is worth much more than a retrofitted one.

## Tests derived from the design, not from the code

These are invariants of the contest and the math, so they can be written before the
implementation exists and they will survive any refactor of it. Each one fails loudly if the
thing it protects breaks.

**The payout function covers four branches.** Rule 19(d)(i) through (iv), each with an
explicit case, including the one that pays a wiped-out field.

**The final-week copy theorem.** If every live entry picks the same team, expected payout is
exactly `P/|A|` for any win probability. A payout function that does not reproduce this has
the wipeout branch wrong.

**The `a/p` reduction.** One game, two cohorts that partition the field, terminal week. The
exact evaluation must equal `a/p` up to normalization. This pins the claim in
`02-objective-function.md` that `a/p` is a special case rather than a mistake.

**Convolution parity.** On a small synthetic slate, the convolution's distribution of `|S|`
must equal brute-force enumeration over all `2^g` outcome vectors, exactly.

**First moment.** `E[|S|]` from the convolution equals `sum_t n_t a_t`, exactly.

**Monotonicity.** Expected payout is increasing in `a_u` and decreasing in `n_u`, holding
everything else fixed. Any formula that violates this has a sign error.

**Hall's condition.** A synthetic state holding exactly one team from the union of the
twelve gauntlet teams is infeasible, and the recommender must refuse rather than warn. A
state holding one Thanksgiving-only team and one Christmas-only team is feasible.

**Availability parity.** Parsed per-entry rows must reproduce the file's own aggregate
availability row, team by team. This is a free and total check on the parser, and it is the
one that would have caught the alignment failure below.

**No look-ahead.** A replay given inputs timestamped after the deadline must raise, not warn.

## A parser failure found during this research pass

Extracting the per-entry grid from the 2026 Week 2 file with layout-preserving text and
fixed column offsets produced Jacksonville 4,106, Indianapolis 2,849 and 1,317 entries with
no pick at all. The file's own aggregate row says Jacksonville 8,127 and Indianapolis zero,
and every live entry has made exactly one pick. The columns drift in the extracted text.

Two things follow. Parse with word positions from the PDF's text layer, not with column
offsets in a flattened rendering. And make the aggregate-row parity check a hard assertion at
ingest, because it catches this class of failure completely and for free.

## Untested assumptions, as of this research pass

| Assumption | Confidence | How to settle it |
|---|---|---|
| Market beats public models on NFL win probability | medium | Brier and log loss on archived snapshots |
| Power or Shin de-vig beats multiplicative here | medium | same harness, held-out log loss |
| Games within a week are near-independent | low | dispersion of favorites-won counts versus Poisson-binomial |
| Availability files exist for all weeks back to 2023 | low | three 2025 weeks not found, probe filename variants |
| NFL week mapping of the 2026 holiday legs | medium | check the published schedule against rules 8, 9, 11 |
| Aliases are stable identifiers across weeks | medium | join consecutive files and count unmatched rows |
| Field behavior is stable enough to pool across seasons | low | season effect in the choice model, tested |
| An eight-week horizon transfers from a survival objective | low | tune `h` on 2024-2025, hold 2026 out |
