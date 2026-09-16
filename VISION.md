# Vision

## Problem

Circa Survivor is a 20-pick NFL elimination contest with 25,017 entries and a $25,017,000
prize pool in 2026. Circa takes no rake, so the average entry is worth exactly its $1,000
fee and every dollar of edge is redistributive. The contest is not won by picking winners.
It is won by holding a larger share of a smaller field at the moment the contest resolves,
which makes the payoff depend on what 16,978 other entries do as much as on what the teams
do.

Jamie built a working dashboard that scores each week's teams on three pillars: win
probability from live betting lines, future value, and projected pick popularity. The
pillars are right. The formulas that combine them were fit by hand, the popularity model
overfits recent weeks, the future-value term is not derived from anything, and the weekly
field data is typed in by hand from a photo. Nobody has checked whether the objective the
dashboard maximizes is the objective the contest pays out on.

This project is the analytical half: establish what the correct objective is, what the
inputs must be, and how to compute the pick, before any of it is built.

## Who it is for

The syndicate holding three 2026 entries. Jamie owns the dashboard and the contest
relationship. Adam owns the algorithm, the data pipeline, and the validation. Jeremy holds
roughly 55 percent of the economics and is the risk principal. Each of the friends holds
5 percent per entry.

## Utility goals

Numbered. Each one testable.

1. **The objective function is written down and defended.** Known when the payout rule in
   the official contest rules can be evaluated on any (pick, field state, outcome) triple
   and the weekly recommendation is an argmax of it, not of a proxy.
2. **Every input is measured, not tuned.** Known when each of the three pillars is
   estimated from data with a held-out score, and no constant in the pipeline was chosen
   to fit the current season.
3. **The field is observed, not guessed.** Known when the weekly Circa team-availability
   file is ingested automatically and the model conditions on the actual joint state of
   16,978 entries rather than an aggregate popularity guess.
4. **The gauntlets never bind by accident.** Known when the recommendation refuses any pick
   that leaves no feasible assignment through the Thanksgiving and Christmas legs.
5. **A decision is defensible in one screen.** Known when Jamie can see, for the chosen
   pick, its win probability, the field it commits us to, what it costs later, and the
   runner-up it beat and by how much.

## Craft goals

1. **A pure core.** Probability, field state, and the objective are values in and values
   out. Network, PDF parsing, and rendering live at the edges and touch nothing else.
2. **Named domain types over tuples.** `TeamId`, `ContestWeek`, `FieldState`,
   `AvailabilitySet`. A pick is never a bare string and a week is never a bare integer.
3. **The simulator is the hot path and it is pinned.** A weekly decision means simulating
   the field forward across 20 contest weeks many times. The per-simulation cost carries a
   counted-work assertion, not a wall-clock one.
4. **Backtests are reproducible from archived inputs.** Every historical run is driven by
   the odds snapshot and availability file as they existed at the decision deadline, never
   by anything observed after it.

## Non-goals

- Betting advice outside the contest. Hedging is analyzed as contest strategy, not as a
  book of bets we place.
- Rebuilding Jamie's dashboard. This project supplies the algorithm and the data. The
  front end stays where it is until a decision record says otherwise.
- Beating the betting market. Market prices are taken as the win-probability input, not as
  something to improve on.
- A general survivor-pool product. Circa's specific payout lattice and published field data
  are the whole point.

## Success criteria

The 2026 season is a single sample and cannot grade the work. The grade is:

- A backtest over 2023 to 2025 in which the strategy's expected payout, evaluated against
  the actual field and actual results, beats both the chalk strategy and Jamie's current
  formula, with the comparison run on data available at each decision deadline.
- Every weekly recommendation for the rest of 2026 delivered before the Saturday 4:00 PM PT
  deadline with its inputs archived.

## Horizon

**Phase 1, research.** Settle the objective, the inputs, and the solution method on paper.
Produce the decision records. No code. This is where the project is now.

**Phase 2, ingest and replay.** Parse the archived Circa availability files and odds
snapshots into a typed record of the field for 2023 to 2026. Replay past weeks. Still no
optimizer.

**Phase 3, the estimator.** Fit the field's pick behavior as a conditional choice model on
the replay corpus, with held-out weeks.

**Phase 4, the decision.** Simulate the field forward, evaluate the payout rule, and return
a ranked pick list with the runner-up gap.

**Phase 5, in season.** Weekly runs against the live deadline, with the untested-assumption
inventory carried forward each week.

## Settled scope

Nothing is settled yet. The research phase exists to produce the first decisions.
