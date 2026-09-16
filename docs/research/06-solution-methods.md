# Solution methods

The objective in `02-objective-function.md` has no closed form. It also does not need Monte
Carlo everywhere, and knowing which parts are exact is what keeps this fast and honest.

## The one-week expectation is exact, and cheap

`|S|` is a sum over the week's games. Each game contributes `n_home` entries with probability
`a_home` and `n_away` with probability `1 - a_home`, and nothing else. So the distribution of
`|S|` is a convolution of `g` two-point distributions, where `g` is the number of games,
thirteen to sixteen after byes.

Convolve them over an integer axis of length `|A|`. That is `O(g * |A|)` work, about 270,000
operations at a 17,000-entry field, which is microseconds. For each candidate pick `u` we
need the same convolution with `u`'s own game removed, and prefix and suffix convolutions
give all `g` leave-one-out distributions in one more pass. Then

```
E[ W / |S| | pick u ]  =  a_u * sum over z of  Pr(Z_u = z) / (n_u + z)
```

exactly, with no sampling error at all. Enumerating all `2^g` outcome vectors would also work
and is only 8,192 to 65,536 cases, but the convolution is strictly better and gives the whole
distribution of `|S|`, which is worth having for its own sake.

If the common-factor test in `03-inputs-win-probability.md` finds a real within-week
correlation, condition on the factor, convolve per level, and mix. Still exact, still cheap.

So the sampling is needed for exactly two things: what the field will pick, and what happens
after this week.

## What the field will pick

The choice model in `04-inputs-field-model.md` gives a distribution over `n`, not a point.
Two ways to handle it, in increasing order of effort.

Plug in the mean `n` and run the exact convolution. Fast, and biased, because `E[1/|S|]` is
convex in the block sizes and a plug-in mean understates it.

Draw a few hundred `n` vectors from the alias-level model and average the exact evaluations.
This is the right default. The outer loop is small because the number of candidate picks is
at most about twenty, so the whole weekly evaluation is a few hundred convolutions.

The state space compresses hard early, which is when the field is largest. In Week 2 of 2026
every live entry has used exactly one team and only sixteen teams were used by survivors, so
there are **exactly sixteen distinct availability sets across 16,978 entries**. The field is
a sixteen-bin histogram, not seventeen thousand agents. By mid-season the distinct sets
approach the entry count, but by then the entry count is in the low thousands and falling.
Cost is bounded by `min(|A|, distinct sets)`, and that product peaks somewhere in the middle
weeks. Measuring where is a cheap ticket once the parser is trustworthy.

## What happens after this week

This is the only genuinely hard part. The continuation value is the expected payout from
being alive in week `w+1` with our availability, against a field with its availability, and
it is a function of a state too large to tabulate.

**Rolling-horizon simulation.** Simulate forward `h` weeks with the field model and the
rating random walk, stop at a terminal heuristic, and back out the value. Straightforward,
and the horizon `h` is the tuning knob discussed in `05-future-value-and-constraints.md`.
Bergman and Imbrogno found about eight weeks best for a survival objective, which is a
starting point, not an answer.

**Regression on continuation values.** The better method, and the standard one for this shape
of problem. Simulate many full-season paths under the field model. On each path record the
state at every week and the realized payout. Regress payout on state features and use the
fitted function as the continuation value. This is Longstaff-Schwartz, and the reason it
belongs here is that our problem *is* an optimal stopping problem in disguise: each week we
decide which option to exercise from a shrinking set, with the value of waiting driven by
information that has not arrived yet.

Candidate state features, all cheap:

```
week index
our availability: count, summed strength, gauntlet slack (TG / Xmas / union)
field size |A|
field availability: the 32-vector, or its top few principal components
our scarcity premium: for each team we hold, the field's burn rate on it
```

**Exact endgame.** When the field is small enough, stop approximating. With a few dozen
entries the availability file gives every one of them exactly, the remaining weeks are few,
and the tree can be enumerated or solved by backward induction over the true state. The
switchover point is worth finding, because the endgame is where the money is and it is the
only regime where being exactly right is achievable.

## Multi-entry

While our three entries are a negligible share, `02-objective-function.md` shows the problem
separates and all three take the same argmax. The separability error is of order `k/|S|`,
so at a thousand survivors it is a third of a percent and at thirty survivors it is ten
percent. Somewhere in the low hundreds it stops being ignorable.

Below that threshold, optimize the three jointly. The natural algorithm is greedy: pick the
best single entry, then the best addition given it, then the third. The March Madness
multi-entry work proves the analogous objective is monotone submodular, which is what makes
greedy respectable, and also shows that the best single entry need not appear in the optimal
pair. So greedy is a starting point to be checked against full enumeration, which at three
entries and twenty candidates is 8,000 combinations and therefore free.

## Robustness, and what to do with the runner-up

Every number in the pipeline is estimated. The decision should report how fragile it is.

Perturb the win probabilities across de-vig methods and by a point in each direction.
Perturb the field model's coefficients within their standard errors. Re-run. Report, for each
candidate, the fraction of perturbations in which it is the argmax.

This is not decoration. It is the input to the diversification question. If one candidate
wins 90 percent of perturbations, all three entries take it. If two candidates split evenly,
spreading across them costs nothing in expectation and buys real protection against being
wrong in a correlated way across all three entries. That is the honest, priced version of
"we have three entries so we should spread them."

## What not to build

**No equilibrium solve.** The field is 5,250 mostly non-strategic decision-makers and the
observed behavior is nothing like an equilibrium. Fit the behavior, do not assume it. Revisit
only in the endgame, as its own decision record.

**No full-season enumeration.** Choosing 20 teams from 32 in order is astronomically large,
and the whole point of the rolling horizon is that the far future is noise anyway.

**No closed-form EV column.** The temptation to ship `a/p` because it fits in a spreadsheet
is exactly the error `02-objective-function.md` documents.

## Cost

The decision runs once a week against a Saturday deadline, so the budget is minutes and the
real constraint is iteration speed during development, not production latency. That said, the
craft goal stands: the convolution is the hot path, its cost is `O(g * |A|)` per candidate
per field draw, and that formula belongs in a counted-work assertion rather than a stopwatch.

## Shape

```
  candidate picks u          field draws n^(1..m)         rating paths
  (<= 20 per week)           (alias-level model)          (random walk)
         |                          |                            |
         |                          v                            v
         |                 exact convolution              continuation value
         |                 over g games  ->                V(state) fitted by
         |                 distribution of |S|             regression on paths
         |                          |                            |
         +------------+-------------+----------------------------+
                      v
        E[W/|S|] this week  +  Pr(survive) * E[V(next state)]
                      v
        rank, runner-up gap, perturbation win-rate per candidate
                      v
        one pick per entry, or a spread when the win-rates say so
```
