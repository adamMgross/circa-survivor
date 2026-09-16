# Research: Circa Survivor strategy and algorithm

Phase 1 of `../../VISION.md`. Settle what the contest actually pays, what we are therefore
maximizing, what the inputs have to be, and how to compute the pick. No code.

Read in order.

| Document | What it settles |
|---|---|
| [01 Contest mechanics](01-contest-mechanics.md) | The rules that drive the math, from the official 2026 rules, and where the transcript differs |
| [02 The objective function](02-objective-function.md) | What a pick maximizes, why `a/p` is wrong, and the closed form that settles the transcript argument |
| [03 Input: win probability](03-inputs-win-probability.md) | Which market, how to de-vig, when to snapshot, how to project forward |
| [04 Input: the field](04-inputs-field-model.md) | Circa publishes the full field every week. What to model and what to stop guessing |
| [05 Future value and constraints](05-future-value-and-constraints.md) | Future value as a shadow price, the holiday gauntlets, the planning horizon |
| [06 Solution methods](06-solution-methods.md) | What is exact, what needs sampling, and what not to build |
| [07 Validation and backtesting](07-validation-and-backtesting.md) | How to grade this when there are four seasons of data |
| [sources](sources.md) | Annotated, with what to trust |

## The ten findings

**1. The payout rule has four branches and the transcript knows one of them.** Rule 19(d)
resolves the contest at the end of every week. A lone survivor takes the entire pot. If
nobody survives, the pot is split among everyone who was alive and submitted a pick, so a
total wipeout cannot leave you behind. Both branches change the endgame materially.

**2. The objective is `E[W/|S|]`, and the folklore formula gets the ordering wrong.** Win
probability over pick share, `a/p`, is Clair and Letscher's exact answer to a one-game pool
whose two cohorts partition the field. Circa spreads its field across thirteen games and a
dozen winners. Scored against the real Week 1 2026 field, `a/p` rates a 1 percent contrarian
pick 28 times better than the 30 percent chalk. The correct calculation rates it 1.07 times
better. **The folklore formula overstates the contrarian edge by a factor of twenty-six**,
and it does so unevenly across candidates, so it is not a rescalable error.

**3. The season runs the opposite way from how the transcript describes it.** Contrarian
value scales with the share of the *expected surviving field* a cohort represents. Early,
the field is huge and spread, and no cohort's death moves `|S|` much, so a swing is worth a
few percent and the pick is nearly a pure survival problem. Late, one cohort is the whole
distribution, and a swing is worth a hundredfold or more. Adam's instinct that the final week
is when you take the surest thing, and Jamie's agreement with it, are both wrong on expected
value. Copying the field in the final week is a risk-free way to earn exactly the field
average and forfeit all edge.

**4. One formula settles the argument in the transcript.** Final week, field on `X`, us
considering `Y` in another game: deviate exactly when `odds(X)/odds(Y) < |A| - 1`. At two
entries that says take the better team, which is Adam. At five thousand it tolerates an odds
ratio of 4,999, which is Jamie. Same formula, pool size the only parameter. In Jamie's own
Chiefs-Dolphins example the deviation is worth $3.75M against $5,000.

**5. Circa publishes the entire field, every week, per entry, and has since at least 2024.**
Not a tweeted photo. A PDF at a predictable URL carrying the aggregate availability row and
every live entry by alias with every team it has used. The joint state that every survivor
tool in existence has to guess at is published. This eliminates the project's stated biggest
friction and supplies a backtest corpus of tens of thousands of entry-weeks per season with
the choice set attached to every observation.

**6. The field is 5,250 decision-makers, not 17,000 entries, and it concentrates.** Among
surviving 2026 entries the mode is one entry per alias, not ten. Of the aliases whose ten
entries all survived Week 1, 58 percent put all ten on the same team, mean 1.71 distinct
teams. `|S|` is a sum over lumpy blocks, not over independent entries, so its distribution is
wider than an independence model implies, and `1/|S|` is convex.

**7. The holiday gauntlets are published in advance and bind by quality, not by count.**
Rules 8 and 9 name ten Thanksgiving teams and eight Christmas teams, six of them shared,
twelve in the union. Feasibility is a two-slot matching and Hall's condition is a four-line
check. Eleven picks come before the Thanksgiving leg, so the constraint is nowhere near
binding by arithmetic, but the twelve teams in the union are disproportionately the ones a
survivor entry wants to spend in September. The shadow price exists from week 1.

**8. Three entries are worth nothing extra early and a great deal late.** Rule 10 makes
entries independent and rule 3 pays each separately, so the payout is a sum, not a maximum,
and while our share is negligible the problem separates and all three should take the same
pick. Once our entries are a material share of the survivors it stops separating, and a
worked endgame case shows splitting beats both concentrated options outright. The two honest
reasons to spread early are model error and the syndicate's risk appetite, and the second is
an owner decision.

**9. The one-week expectation is exact and costs microseconds.** `|S|` is a convolution of
`g` two-point distributions over the week's games. Convolve over an axis of length `|A|`,
take leave-one-out convolutions by prefix and suffix, and every candidate's expected payout
is exact with no sampling error. Sampling is needed only for what the field will pick and for
what happens after this week.

**10. Circa takes no rake.** Entries times $1,000 equals the prize pool in every published
season. The average entry is worth exactly its $1,000 fee, so this is a zero-vig contest and
every unit of edge is pure transfer from the rest of the field. It also sets the honest
baseline: three entries are worth $3,000 of expected value before any edge at all, and the
modal outcome is still zero.

## Where the edge is, ranked by expected value per unit of work

1. **Fix the objective.** Finding 2 is a change of ordering, not of scale, and it is free.
2. **Ingest the availability files.** Finding 5 replaces a guess with an observation and
   unlocks findings 6 and 8 and the whole backtest.
3. **Carry field scarcity into future value.** Holding a team the field has burned is worth
   far more than holding an equally good team the field still holds. No public tool does
   this, the data is free, and `05-future-value-and-constraints.md` argues it is the most
   likely source of unique edge.
4. **Estimate the field model instead of tuning it.** Finding 6 plus three seasons of labeled
   choices, walk-forward scored.
5. **De-vig properly.** 2.6 percentage points on a `-1000` favorite, and it moves `|S|`.

## What this does not settle

The syndicate's risk appetite. Everything above maximizes expected value, which is the right
objective only if the stakeholders are risk-neutral over their own stake. Jeremy holds
roughly eleven times Adam's exposure. Whether the recommendation should be an expected-value
argmax or something concave changes the answer and is not ours to decide.

## The immediate operational fact

The Week 2 selection deadline is **Saturday 2026-09-19 at 4:00 PM PT**. The Week 2
availability file is published and parsed. Nothing in this research pass is required to make
that pick, and nothing in it is built yet.
