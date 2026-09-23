---
id: fs-fnhf
status: open
deps: [fs-gkjt, fs-0d0o]
links: []
created: 2026-09-16T15:30:34Z
type: feature
priority: 2
assignee: Adam Gross
tags: [validation]
---

# Backtest harness scored on expected payout against Jamie's formulas

Four seasons of data is four outcome paths, so strategies are compared on model-implied expected payout against the true published field, not on what happened. See docs/research/07-validation-and-backtesting.md.

## Design

Replay each historical contest week from the deadline snapshot and that week's availability file. Run every strategy on the realized field composition first, which isolates the decision rule from field-model error, then again on the modeled field, and report the difference as the price of field-model error. Average over simulated outcomes rather than the realized one.

## Acceptance Criteria

Chalk, naive a/p, Jamie's current formula, a survival-maximizing strategy, random feasible, and the proposed strategy all run in the same harness. Results are expected payout per entry in dollars. A replay handed any input timestamped after the deadline raises. The number of variants tried is recorded.


## Notes

**2026-09-23T23:30:26Z**

Rescoped 2026-09-23: the baseline is Jamie's formulas as they are in src/, so the dependency on fs-2crt is gone. Estimands per docs/arch-review/2026-09-18.md finding S4. Deadline-time odds for 2024-2025 need fs-mgyt, otherwise closing lines with that caveat stated.
