---
id: fs-0d0o
status: open
deps: [cs-l0oa, cs-ascn]
links: []
created: 2026-09-16T15:30:14Z
type: feature
priority: 1
assignee: Adam Gross
tags: [core]
---

# Replace computeEV with the exact expectation over the slate

The app's EV is `w / E[survivors | win]`, a linearization of the exact `w * E[1 / survivors | win]`. Scored on the real fields it lands within a few percent of exact enumeration but under-credits non-chalk picks and reorders the top: Week 1 exact ranks DET first where the app ranks JAX, and Week 2 exact ranks TB twelfth where the app ranks it fifth. The survivor count is a convolution of one two-outcome distribution per game, so the exact value is cheap. See docs/research/06-solution-methods.md and review finding I3.

## Design

Convolve cohort counts over an integer axis for every game except the candidate's, with ties as a third outcome that eliminates both sides once tie probabilities are sourced. Shown as an exact EV column beside the current EV before it replaces it, with the current formula kept as the named baseline.

## Acceptance Criteria

Equal to brute-force enumeration of every outcome vector on a small synthetic slate within floating-point tolerance, reproduces the Week 1 and Week 2 orderings above from the archived data, and expected payout is increasing in the candidate's win probability and decreasing in its pick count.
