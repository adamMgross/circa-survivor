---
id: fs-ta9j
status: open
deps: [fs-rs6a]
links: []
created: 2026-09-16T15:30:14Z
type: feature
priority: 1
assignee: Adam Gross
tags: [model]
---
# Score win-probability sources and de-vig methods on held-out games

Two assumptions the whole pipeline rests on are currently unmeasured: that the market beats public models, and that power or Shin de-vigging beats multiplicative on the lopsided lines survivor candidates always sit on. The second is worth 2.6 percentage points on a -1000 favorite and moves the expected surviving field, which is the payout denominator.

## Acceptance Criteria

Brier score, log loss and a reliability curve per source and per de-vig method on held-out games. The winner is chosen by held-out log loss and recorded in a decision record with the numbers. The untested-assumptions table in docs/research/07-validation-and-backtesting.md is updated.

