# Vision

## Problem

Circa Survivor 2026 is a 20-pick NFL elimination contest with 25,017 entries, a $25,017,000
pool, and no rake, so the average entry is worth exactly its $1,000 fee and every dollar of
edge is taken from the rest of the field. The payoff depends on what the other entries pick as
much as on what the teams do. One of the syndicate's three entries, CIRCAmcised-2, is alive
going into Week 3, among 8,610 survivors.

The planner this repository forks already automates the inputs. Sportsbook lines, power
ratings, Circa's weekly Selections file and ESPN results arrive on a schedule, and every team
is scored on win chance, pick popularity, future value, EV and DILI. What it does not do is
justify its numbers:

- EV is `w / E[survivors | win]`, a linearization of the exact `w · E[1 / survivors | win]`.
  On the real Week 1 and Week 2 fields it lands within a few percent of exact enumeration but
  under-credits non-chalk picks enough to reorder the top candidates.
- Future value and DILI rest on about nine hand-set constants that nothing derives or scores.
- The popularity model is fit by a weighted L1 grid search on two weeks and never scored on a
  week it did not see.
- The raw inputs are not archived, so no past recommendation can be recomputed, and nothing
  measures whether any of these formulas beats a simpler rule.

## Who it is for

Adam owns this fork, the model, the data and the validation. Jamie built the original
planner, runs his own copy, submits the syndicate's picks at Circa and holds the contest
relationship, so he receives findings rather than code. Jeremy holds roughly 55 percent of the
economics and is the risk principal. Each of the friends holds 5 percent per entry.

## Utility goals

1. **Every recommendation is reproducible.** Known when each week's raw Circa files and
   per-book odds are archived with a timestamp before the deadline, and the recommendation
   is recomputed from the archive alone.
2. **The objective is written down and computed exactly.** Known when rule 19(d) is one
   function with fixtures for every terminal branch, including three final-week submitters
   and two survivors, and the weekly EV is exact under its stated assumptions rather than
   linearized.
3. **Every model input is measured or derived, not tuned.** Known when popularity is fit by
   likelihood with a held-out score each week, the de-vig method is chosen on held-out log
   loss, and future value comes from the entry's best remaining path instead of constants.
4. **The holiday legs never bind by accident.** Known when a pick that leaves no feasible
   assignment through the Thanksgiving and Christmas legs is refused, not docked.
5. **A decision fits on one screen.** Known when the chosen pick shows its win chance, the
   field it commits us to, what it costs later, and the runner-up it beat and by how much.
6. **Every change is measured against Jamie's formulas.** Known when his current EV, DILI and
   popularity model run as a named baseline beside each replacement, in the backtest and in
   the prospective 2026 record.

## Craft goals

1. **A pure model core.** `src/model/` imports nothing but the schedule, the ratings fit and itself. No React,
   no `fetch`, no clock. The data scripts are fetch, then a pure transform, then a write.
2. **Values, not places.** Model functions return new rows. Nothing mutates a caller's object,
   and a row's fields do not depend on the order functions were called in.
3. **Named domain shapes at the edges.** A game key, a pick source (observed or modeled) and
   a no-pick are named, closed values, not strings with an agreed format.
4. **Tests state invariants.** Fixtures, not the live data files the bots rewrite. The exact
   evaluator has a brute-force parity test, and every replacement has a parity test against
   the formula it replaces.
5. **The fit is pinned by counted work.** The popularity fit computes each (a, b)-independent
   term once per fit, and a test counts the evaluations so a regression fails rather than
   slows.

## Non-goals

- Contributing back to `mfe-labs/circa-survivor`. Decision 0002.
- A server or a database. Decision 0003.
- Beating the betting market. Market prices are the win-probability input. Decision 0004.
- Betting advice outside the contest, and a general survivor-pool product. Circa's payout
  rule and its published field data are the whole point.

## Success criteria

The 2026 season is a single sample and cannot grade the work. The grade is:

- A replay of 2024 and 2025 from archived Circa files, scored on expected payout per the
  estimands in `docs/arch-review/2026-09-18.md` finding S4, in which the new model beats both
  chalk and Jamie's formulas with the assumptions it holds under stated.
- Every remaining 2026 recommendation for CIRCAmcised-2 delivered before its deadline with
  its inputs archived, and the popularity model's weekly held-out score recorded.

## Horizon

**Onboard and extract.** The portfolio layout, then the model moved out of the UI file with
the tests untouched. Where the project is now.

**In season.** Deadline-time archives, the exact EV, holiday feasibility, and a pre-deadline
lines pull, while CIRCAmcised-2 is alive.

**Measured inputs.** Popularity fit by likelihood and scored weekly, de-vig calibrated on
nflverse history, future value derived from the best remaining path.

**Replay.** The 2024 and 2025 Circa files archived and parsed, and the backtest against the
baseline.

**2027.** The next contest, entered with a model that has a record.

## Settled scope

- 0002: fork the planner, merge the research, no upstream contributions.
- 0003: data lives as JSON in the repository, served by GitHub Pages and updated by Actions.
- 0004: Win % comes only from sportsbook moneylines, the median of per-book de-vigged
  probabilities. A spread, a rating or a model never produces one.
