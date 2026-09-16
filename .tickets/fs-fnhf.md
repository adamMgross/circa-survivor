---
id: fs-fnhf
status: open
deps: [fs-gkjt, fs-rs6a, fs-0d0o, fs-2crt]
links: []
created: 2026-09-16T15:30:34Z
type: feature
priority: 1
assignee: Adam Gross
tags: [validation]
---
# Backtest harness with six benchmarks, scored on expected payout

Four seasons of data is four outcome paths, so strategies are compared on model-implied expected payout against the true published field, not on what happened. See docs/research/07-validation-and-backtesting.md.

## Design

Replay each historical contest week from the deadline snapshot and that week's availability file. Run every strategy on the realized field composition first, which isolates the decision rule from field-model error, then again on the modeled field, and report the difference as the price of field-model error. Average over simulated outcomes rather than the realized one.

## Acceptance Criteria

Chalk, naive a/p, Jamie's current formula, a survival-maximizing strategy, random feasible, and the proposed strategy all run in the same harness. Results are expected payout per entry in dollars. A replay handed any input timestamped after the deadline raises. The number of variants tried is recorded.

