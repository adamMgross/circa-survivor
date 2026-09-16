---
id: fs-zj45
status: open
deps: [fs-0d0o, fs-ri3y]
links: []
created: 2026-09-16T15:30:34Z
type: feature
priority: 2
assignee: Adam Gross
tags: [core]
---
# Continuation value by regression on simulated paths

The only part of the objective that genuinely needs approximation. Simulate full-season paths, record state and realized payout at every week, regress payout on state features, use the fit as the continuation value. This is Longstaff-Schwartz, and the problem is an optimal stopping problem in disguise. See docs/research/06-solution-methods.md.

## Acceptance Criteria

Out-of-sample R-squared on held-out simulated paths is reported. The fitted value at week w agrees with a full forward simulation from week w within a stated tolerance. The horizon h is tuned on 2024 and 2025, not carried over from a paper with a different objective.

