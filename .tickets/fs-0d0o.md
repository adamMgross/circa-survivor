---
id: fs-0d0o
status: open
deps: []
links: []
created: 2026-09-16T15:30:14Z
type: feature
priority: 1
assignee: Adam Gross
tags: [core]
---
# Exact one-week payout evaluator by convolution over the slate

The distribution of the surviving field is a convolution of g two-point distributions, one per game, so the one-week expectation is exact and costs microseconds. No Monte Carlo is needed for it. See docs/research/06-solution-methods.md.

## Design

Convolve over an integer axis of length equal to the live field. Prefix and suffix convolutions give all leave-one-out distributions in one pass, which is what each candidate pick needs. Pure function of (field composition, win probabilities, candidate). All four branches of rule 19(d) live in one payout function.

## Acceptance Criteria

Parity against brute-force enumeration of all 2^g outcome vectors on a small synthetic slate, exactly. E[|S|] equals sum of n_t a_t exactly. If every live entry picks the same team in the final week, expected payout is exactly P over the field size for any win probability. One game with two cohorts partitioning the field reduces to a/p up to normalization. Expected payout is increasing in the candidate's win probability and decreasing in its pick count.

