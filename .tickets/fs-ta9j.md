---
id: fs-ta9j
status: open
deps: []
links: []
created: 2026-09-16T15:30:14Z
type: feature
priority: 2
assignee: Adam Gross
tags: [model]
---

# Score de-vig methods and book choices on nflverse historical closing lines

Two assumptions the whole pipeline rests on are currently unmeasured: that the market beats public models, and that power or Shin de-vigging beats multiplicative on the lopsided lines survivor candidates always sit on. The second is worth 2.6 percentage points on a -1000 favorite and moves the expected surviving field, which is the payout denominator.

## Acceptance Criteria

Brier score, log loss and a reliability curve per source and per de-vig method on held-out games. The winner is chosen by held-out log loss and recorded in a decision record with the numbers. The untested-assumptions table in docs/research/07-validation-and-backtesting.md is updated.


## Notes

**2026-09-23T23:30:26Z**

Rescoped 2026-09-23: nflverse games.csv carries historical closing moneylines and results for free, so calibration does not wait on deadline snapshots or the paid tier. Compare multiplicative (current, decision 0004), power and Shin, and five-book median against Pinnacle alone.
