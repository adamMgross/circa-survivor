---
id: fs-ri3y
status: open
deps: [cs-l0oa]
links: []
created: 2026-09-16T15:30:34Z
type: feature
priority: 1
assignee: Adam Gross
tags: [model]
---

# Fit popularity by multinomial likelihood and score every week out of sample

The popularity model `win^a * e^(-b * FV) * availability` is already a logit over each leg's teams, but it is fit by a weighted L1 grid search with a prior on two weeks, forces every underdog to zero, and has never been scored on a week it did not see. Fitting the same features by likelihood on the pick counts gives standard errors and a proper score for free. Alias-level correlation and archetypes (docs/research/04-inputs-field-model.md) are deferred until the simple model's weekly score shows a need.

## Acceptance Criteria

Each week's prediction is recorded before the deadline and scored against Circa's posted counts with multinomial log loss, beside Jamie's fit and a chalk-proportional baseline. Underdogs get a nonzero share when the data supports one.
