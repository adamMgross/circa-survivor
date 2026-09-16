---
id: fs-ri3y
status: open
deps: [fs-gkjt, fs-9x8g, fs-rs6a]
links: []
created: 2026-09-16T15:30:34Z
type: feature
priority: 2
assignee: Adam Gross
tags: [model]
---
# Field choice model: conditional logit with alias-level correlation

Replaces the hand-fit constants. Availability is observed, so only the choice has to be modeled. The current model raises win percentage to the tenth power, which is a logit-shaped transform with the coefficient pinned by hand. Estimating it costs nothing and buys a standard error and a held-out score. See docs/research/04-inputs-field-model.md.

## Design

Conditional logit over each entry's available set. The decision unit is the alias, not the entry: 58 percent of the aliases whose ten entries all survived Week 1 put all ten on one team. A Dirichlet-multinomial over an alias's entries reproduces that with one parameter. Cluster aliases into archetypes from their history and simulate the field as a mixture.

## Acceptance Criteria

Fit on 2024 and 2025, walk-forward. Predicted n_t scored against the realized next-week vector with multinomial log loss, one score per contest week, beating a chalk-proportional baseline. 2026 held out entirely.

