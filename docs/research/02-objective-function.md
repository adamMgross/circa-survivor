# The objective function

The dashboard's three pillars are the right three pillars. What is missing is the thing they
are pillars of. This document derives the quantity a Circa Survivor pick maximizes, shows
where the usual survivor-pool heuristic comes from and where it breaks, and settles the
argument in the kickoff transcript with a closed form.

## What we are maximizing

From `01-contest-mechanics.md`, an entry's payout in the week the contest resolves is

```
payout = P / |S|     if the entry survives that week
       = P / |A|     if |S| = 0
       = 0           otherwise
```

where `A` is the live field at the start of the week, `S` the survivors, and `P` the pool.
Write `W` for the event that our entry is alive at resolution. Then

```
E[payout] = P * E[ W / |S| ]  +  (P / |A_T|) * Pr(|S_T| = 0)
```

Three properties of this functional drive everything downstream.

**It is not a survival probability.** `E[W/|S|]` is not `Pr(W)` times anything you can
factor out, because `W` and `|S|` are driven by the same games. Every model that maximizes
survival probability, expected weeks survived, or a product of win probabilities is
maximizing a different thing. Bergman and Imbrogno's Operations Research model maximizes
survival probability. Subvertadown maximizes expected longevity. Both are the wrong
objective for a contest that pays `P/|S|`.

**The dependence on our own pick is entirely a conditioning effect.** Our pick does not
change any other entry's fate. It changes which branches of the outcome tree we are alive
on, and therefore which values of `|S|` we collect. This is the whole of the popularity
pillar, stated exactly.

**The wipeout branch is a constant.** `Pr(|S| = 0)` is nearly unaffected by one entry out of
thousands, so for most of the season the second term is an additive constant we can drop.
It stops being a constant in the endgame, where our own survival is what decides whether
the field is wiped, and there it is worth the entire pot.

## The exact one-week form

Let `n_t` be the number of live entries that will pick team `t`, so `sum_t n_t = |A|`, and
let `a_t` be `t`'s win probability. Picking `u`,

```
E[W/|S|] = a_u * E[ 1 / (n_u + Z_u) | u wins ]
```

where `Z_u` is the survivor count from every game other than `u`'s. Conditioning on `u`
winning forces the whole `n_u` cohort to survive with us, and leaves everything else random.
That single fact is the mechanism behind contrarian play: joining a large cohort means that
whenever we are alive, so are they.

The naive approximation `E[1/(n_u + Z)] ~= 1/(n_u + m)` with `m = E[Z]` gives

```
EV_u  proportional to  a_u / (n_u + m)
```

which is already enough to see the problem with the standard heuristic.

## Where "win probability over pick share" comes from, and why it is wrong here

The survivor-pool folklore formula is `EV = a / p`, win probability divided by pick
popularity. Clair and Letscher derive it exactly, and their derivation names its
assumptions: **one game, two cohorts, and those two cohorts partition the entire field.**
In that setting `m = 0`, because there is nothing outside the one game, and
`a/(n_u + m) = a/n_u`, which is `a/p` after normalizing by `|A|`.

Circa is not that setting. The field is spread over roughly thirteen games and a dozen or
more viable teams, and most of those teams win. `m` is not zero. It is the dominant term.

Stylized on the real Week 1 2026 field. 25,017 entries. The Chargers cohort was 7,585
entries, 30.3 percent of the field, the largest single concentration Circa has recorded.
Give them an illustrative 0.75 win probability, put the other 17,432 entries at a 0.68
survival rate, and consider a contrarian alternative held by 250 entries at a 0.70 win
probability.

| Pick | naive `a/p` | exact `a * E[1/\|S\|]` |
|---|---|---|
| Chargers, 30.3% of field | 2.47 | 3.86e-5 |
| Contrarian, 1.0% of field | 70.05 | 4.18e-5 |
| ratio, contrarian over chalk | **28.3x** | **1.08x** |

The naive formula overstates the contrarian edge by a factor of twenty-six, against the
single most concentrated field in contest history. On an ordinary week it is worse.

This is the most consequential finding in this document. If the dashboard's expected value
column is a product or ratio of win probability and pick popularity, it is not off by a
constant. It is off by a factor that varies by a full order of magnitude across the teams
it is ranking, which means its ordering is wrong, not just its scale.

## Why the edge is small early and enormous late

The correction has a clean interpretation. The contrarian edge scales with the share of the
*expected surviving field* that our cohort represents, not with our share of the current
field. Early, the surviving field is large and spread across many winners, so no single
cohort's death moves `|S|` much. Late, the field is small and concentrated, so one cohort's
death is the whole distribution.

Take the transcript's own thought experiment, which is the extreme case. Final week, `|A|`
entries, all of them on the same team `X`. Our options are to copy or to take the other side
of the same game.

```
copy:      X wins  -> |S| = |A|, payout P/|A|
           X loses -> |S| = 0,   payout P/|A|      (rule 19(d)(iii))
           risk-free P/|A|, exactly the field average

deviate:   X loses -> |S| = 1,   payout P
           X wins  -> payout 0
           EV = P * (1 - a_X)
```

**Deviate when `1 - a_X > 1/|A|`.** With Jamie's numbers, 5,000 entries and an 85 percent
favorite, that is `0.15 > 0.0002`. Deviating is worth $3.75M against $5,000, a factor of
750. Jamie is right, and the margin is not close.

Two corollaries fall out of the same algebra.

**Copying the field in the final week is a risk-free way to earn exactly zero edge.** The
payout is `P/|A|` whether the pick wins or loses. This is worth saying plainly because
Adam's intuition in the transcript, that the last week is where you take the surest thing,
and Jamie's agreement with it, are both wrong on EV. The last week is where contrarian play
is worth the most it will ever be worth. What Adam is reaching for is variance reduction,
which is real and belongs in the utility discussion below, not in the EV objective.

**The general two-game version.** If the field is on `X` and we deviate to `Y` in an
independent game, deviating beats copying exactly when

```
odds_ratio(X) / odds_ratio(Y)  <  |A| - 1
```

writing `odds_ratio(t) = a_t / (1 - a_t)`. At `|A| = 2` this says take the better team, which
is Adam's intuition and is correct for a two-person pool. At `|A| = 5,000` it tolerates an
odds ratio of 4,999, which is why the same intuition inverts in a Circa-sized field. One
formula, both ends of the argument, with pool size as the only parameter. This belongs on
the dashboard as a tooltip.

## The consequence for how the season is played

Combining the two results gives a shape for the season that neither the transcript nor the
public tools state:

```
week    field size     contrarian edge    what dominates the pick
----    -----------    ---------------    ------------------------------------
 1-6    25k -> 3k      a few percent      win probability and future value
 7-13   3k  -> 200     tens of percent    all three pillars comparable
14-20   200 -> 10      100x and up        pick popularity dominates everything
```

Early weeks are nearly a pure survival problem. The right early play is close to maximizing
win probability subject to the future-value and gauntlet constraints, because the popularity
term cannot pay for more than a point or two of win probability. Late weeks are nearly a
pure differentiation problem. The transcript has this backwards in both directions, and it
is the most actionable correction available.

The crossover week is not a guess. It is computable from the live field each week, and
printing it is a cheap and high-value dashboard feature.

## Three entries

Rule 10 makes each entry independent and rule 3 pays each winning entry separately, so our
payout with `k` of three entries alive is `P * k / |S|`, additive, not a maximum. This is a
different problem from the multi-entry March Madness literature, which optimizes the
expected score of the *best* entry and finds a submodular objective. Ours is linear in our
own entries except through the denominator.

**While our share of the field is negligible, the three entries separate.** `|S|` is
essentially unaffected by our own three entries, so `E[sum_i W_i / |S|]` decomposes into
three identical problems, and all three entries should take the same argmax pick. Under
risk neutrality, three entries buy exactly three times one entry's expected value and
diversification buys nothing.

**Once our share is material, they stop separating, and spreading wins.** Worked example,
final week, three entries left in the whole contest: ours (two) and one rival on `X` with
`a_X = 0.5`, against an alternative `Y` in an independent game with `a_Y = 0.6`.

| Our two entries | Expected payout |
|---|---|
| both on X | 0.667 P |
| both on Y | 0.633 P |
| one on X, one on Y | **0.733 P** |

Splitting wins because it keeps us paid on the branch where `X` wins and `Y` loses, which
both concentrated strategies throw away. So the reason to hold three entries is not a
constant. It is worthless in week 2 and load-bearing in week 19.

**The two honest reasons to diversify early anyway.** Neither is in the EV objective and
both are real.

*Model error.* The argmax is an argmax of our estimates. Under parameter uncertainty the
ranking of the top few picks is itself uncertain, and spreading across them raises the
worst-case expected value. This is a distributionally robust hedge, and it can be priced by
re-running the decision under perturbed inputs and looking at how often the ordering flips.

*Utility.* Three identical entries are perfectly correlated and die together. Adam holds 5
percent of each of three entries, Jeremy roughly 55 percent. EV maximization is the right
objective only if the stakeholders are risk-neutral over their own stake, and Jeremy carries
eleven times Adam's exposure. Whether the syndicate wants EV or something concave is a
decision only the syndicate can make, and it changes the recommendation. That is an owner
ticket, not a modeling choice.

## Shape of the computation

```
   odds snapshot          Circa availability PDF        schedule + rules
   (Sat, pre-deadline)    (every entry, every week)      (20 weeks, gauntlets)
         |                          |                            |
         v                          v                            v
   win probability            field state F_w             feasible pick sets
   a_t for week w        (n_t and the joint sets)        (assignment + Hall)
         |                          |                            |
         +------------+-------------+----------------------------+
                      v
             field behavior model:  Pr(entry picks t | its availability, week, a)
                      |
                      v
            simulate the field forward, weeks w..20
                      |
                      v
              E[ W / |S| ] for each candidate pick u
                      |
                      v
          ranked picks, runner-up gap, contrarian-edge crossover
```

Nothing in that diagram is a closed form. The objective has no known closed form once the
field is spread across games and the horizon is longer than one week, which is why
`06-solution-methods.md` is about simulation and not about algebra.

## What this changes about the dashboard

1. Replace the expected-value column with `a_u * E[1/|S|]`, estimated by simulation. Keep
   `a/p` nowhere, not even as a secondary column, because it is not a monotone transform of
   the right answer.
2. Show the contrarian-edge multiplier for the current week, computed from the live field.
   It tells you how much win probability a swing is allowed to cost.
3. Print the runner-up and the gap. A decision that is a coin flip between two teams is a
   different decision from one with a clear winner, and it is the case where spreading the
   three entries is free.
4. Treat survival probability, expected longevity, and win probability as diagnostics, never
   as objectives.
