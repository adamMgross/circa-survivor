---
id: fs-ri3y
status: closed
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

## Notes

**2026-09-24T01:15:09Z**

likelihoodPick and fitLikelihood (Newton on the multinomial log-likelihood, same win^a e^-bFV availability form, every team with a line, se from the information matrix) in src/model/popularity.js beside Jamie's fitParams and a chalk baseline (win x availability). predictionRecord fits only on legs before the leg. update-data.yml runs scripts/record-predictions.mjs each pull, rewriting data/predictions/<leg>.json until that leg's deadline. scripts/score-predictions.mjs prints log loss per model. W3 is the first deadline-clean week. Retro W2 fit on W1 (closing lines, ratings as of today, not deadline-clean): likelihood 1.632, Jamie 1.652, chalk 2.972 nats per entry. The page still shows Jamie's P%.
