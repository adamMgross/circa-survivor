---
id: fs-qar4
status: open
deps: []
links: []
created: 2026-09-16T15:30:52Z
type: task
priority: 3
assignee: Adam Gross
tags: [model]
---
# Measure within-week correlation between NFL game outcomes

Every formula in docs/research/02-objective-function.md uses the joint distribution of a week's outcomes. If favorites tend to win or lose together, the surviving field is more dispersed than independence implies, and since the payout is one over the survivor count, which is convex, dispersion pays. Currently an untested assumption of low confidence.

## Acceptance Criteria

Dispersion of the count of market favorites that won per week, over twenty seasons, compared against the Poisson-binomial implied by de-vigged lines. If the excess is material, a single latent common factor is fit and carried into the evaluator.

