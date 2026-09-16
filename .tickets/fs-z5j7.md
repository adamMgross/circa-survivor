---
id: fs-z5j7
status: open
deps: [fs-gkjt]
links: []
created: 2026-09-16T15:30:34Z
type: feature
priority: 2
assignee: Adam Gross
tags: [model]
---
# Carry projected field scarcity into future value

Holding a team the field has already burned is worth far more than holding an equally good team the field still holds, because spending it later puts us in a small cohort in a small field. No public tool does this, the data is published weekly, and docs/research/05-future-value-and-constraints.md argues it is the most likely source of edge nobody else has.

## Acceptance Criteria

For each team we hold, the model carries the field's burn rate on it and projects availability to the week we would spend it. A backtest isolates the term's contribution against the same strategy with it disabled.

