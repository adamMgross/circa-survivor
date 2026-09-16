# Input three: future value, and the constraints that create it

The transcript is candid that nobody remembers how the dashboard computes future value, and
that it is some blend of a public power ranking and whatever forward odds exist. Future
value is not a property of a team. It is a shadow price, and it has a definition.

## The definition

Future value of team `t` in week `w` is the opportunity cost of spending it:

```
FV(t, w) = V(week w+1, availability A)  -  V(week w+1, availability A \ {t})
```

the drop in our optimal continuation value from no longer holding `t`. Everything else is
an approximation to this number, and approximations are fine, but they should be labeled as
approximations to something, not invented.

Two things follow immediately. Future value is zero for any team we would never use again,
however good it is. And it is large for a mediocre team that is the only thing standing
between us and an infeasible schedule. Neither is a property a power ranking can express.

## The combinatorial skeleton

Strip out the pool and the uncertainty and the problem is a bipartite assignment: 20 contest
weeks on one side, 32 teams on the other, an edge wherever the team plays that week, each
team used at most once, each week filled exactly once. Bergman and Imbrogno call the
stochastic version a sequential stochastic assignment problem.

The deterministic relaxation, maximize the sum of `log a` over a feasible assignment, is a
linear assignment problem. It solves in milliseconds by the Hungarian algorithm, and its
**dual variables are per-team shadow prices**, which is exactly the future-value number the
dashboard is reaching for, derived rather than assumed. Cheap, principled, and a good
approximation. It should be in the pipeline as the fast path and as a sanity check on the
expensive one.

Three reasons it is only an approximation.

It optimizes survival, not payout, so it inherits the wrong objective from
`02-objective-function.md`.

It uses point estimates, which destroys option value (below).

It ignores the field, which is the larger error (below).

## The gauntlets

Rules 8 and 9 name the eligible teams for the two holiday legs in advance.

```
Thanksgiving leg, 10 teams:  GB LAR CHI DET PHI DAL KC BUF DEN PIT
Christmas leg,     8 teams:  HOU PHI GB CHI BUF DEN LAR SEA
overlap,           6 teams:  PHI GB CHI BUF DEN LAR
TG only,           4 teams:  DET DAL KC PIT
Christmas only,    2 teams:  HOU SEA
union,            12 teams
```

Feasibility is a matching with two slots, so Hall's condition reads: at the Thanksgiving
deadline we need at least one unused Thanksgiving team, at least one unused Christmas team,
and at least two unused teams in the union of twelve. It is a four-line check, and the
recommendation engine should refuse any pick that violates it rather than warn about it.

The contest calendar for 2026, derived from the rules' own dates:

```
contest wk   1..11    NFL weeks 1-11
contest wk  12        Thanksgiving leg     Wed Nov 25 / Thu Nov 26 / Fri Nov 27
contest wk  13        NFL week 12, Sun-Mon remainder
contest wk  14..16    NFL weeks 13-15
contest wk  17        Christmas leg        Thu Dec 24 / Fri Dec 25
contest wk  18        NFL week 16, Sun-Mon remainder
contest wk  19..20    NFL weeks 17-18
```

The NFL week numbering is inferred from the 2026 calendar and the dates in rules 8, 9 and
11. Verify it against the published schedule before anything depends on it.

Two facts about the shape. Eleven picks are made before the Thanksgiving leg, so twenty
teams remain and the constraint is nowhere near binding by count. And four contest weeks sit
between the two legs, which is the window in which a reserved Christmas team can be
accidentally spent.

**The gauntlet binds by quality, not by count.** Six of the ten Thanksgiving teams and five
of the eight Christmas teams are the kind of team a survivor entry wants to spend on a
favorable September matchup. The constraint has a shadow price from week 1, long before it
has any chance of being violated, and that shadow price is the honest future value of those
twelve teams. Twenty picks out of thirty-two teams means the no-reuse rule is slack in
aggregate. The gauntlets are where it actually bites.

## Future value is an option, and evaluating it at the mean gets it wrong

The assignment above uses one number per team per week. Real future probabilities are
distributions, widening with the horizon, as `03-inputs-win-probability.md` argues. Because
we choose in week 14 knowing what week 14 looks like, and not what we guessed in week 2, a
team with a volatile rating can be spent in whichever week it happens to look best.

That is a call option on the team, and the assignment evaluated at the mean prices it at
intrinsic value only. The correction is mechanical: sample rating paths from the random
walk, solve the assignment on each path, and average the duals. The spread across paths is
itself informative, since a team whose shadow price is stable across paths is a genuine
reservation and one whose price is volatile is optional.

Direction of the bias: **evaluating future value at the mean systematically undervalues
volatile teams and overvalues stable ones.** Teams with quarterback uncertainty, teams
early in a rebuild, and teams whose ratings have moved a lot are the ones the current
approach is most likely to misprice.

## The correction nobody makes: future value depends on the field

The assignment problem asks what a team is worth to us. The objective asks what it is worth
to us *given who else can still use it*. These are different, and the difference has a sign
that is not obvious.

Suppose by week 15 the field has burned Kansas City almost everywhere, and we still hold it.
Picking it then puts us in a tiny cohort in a small field, which by
`02-objective-function.md` is the regime where the contrarian term is worth a hundredfold.
Holding a team **the field cannot use** is worth far more than holding an equally good team
the field still holds.

This runs opposite to the intuitive version. The intuition says save the good teams. The
objective says save the teams whose future scarcity in the field will be highest, which is a
joint property of team quality and field availability, and the field availability half is
published weekly and currently unused for this purpose.

Two observable handles, both free from the availability files:

- **Field availability trajectory per team.** How fast is the field burning `t`? The file
  gives the level every week, so the derivative is free.
- **Our scarcity premium.** For each team we hold, the fraction of the field that can no
  longer use it, projected to the week we would spend it.

The current model uses field availability only inside the popularity term for the current
week. Carrying it into the future-value term is a genuinely new input, it is free, and it is
the single most likely source of edge that no public tool has.

## How far ahead to plan

Bergman and Imbrogno's headline computational result is that planning partway through the
season dominates both myopic play and full-season planning, with roughly an eight-week
look-ahead best in their setting. The reason is not subtle: week 16 probabilities estimated
in week 2 carry more noise than signal, so optimizing against them imports error.

Two qualifications before adopting eight.

Their objective is survival probability and ours is payout, and the horizon that is optimal
for one need not be optimal for the other. Ours has a term that grows with the contest week,
which argues for a longer horizon than theirs.

The gauntlets are a hard constraint at contest weeks 12 and 17, and a horizon that does not
reach them cannot respect them. The practical form is a rolling horizon of `h` weeks plus
the two gauntlet constraints always enforced, whatever `h` is.

Treat `h` as a hyperparameter chosen by the backtest in `07-validation-and-backtesting.md`,
not as a constant carried over from a paper with a different objective.

## Summary

| Current | Proposed |
|---|---|
| Public power ranking plus whatever forward odds exist | Assignment duals as the fast path, simulated derivative of the objective as the true one |
| Point estimates for future weeks | Sample rating paths, average the duals, report the spread |
| Gauntlets as a warning, if present at all | Hall's condition enforced as a hard constraint on every recommendation |
| Field availability used only for this week's popularity | Projected field scarcity carried into future value |
| Horizon unstated | Rolling horizon `h`, tuned by backtest, gauntlets always enforced |
