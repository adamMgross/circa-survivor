---
id: fs-i6c3
status: open
deps: [cs-l0oa]
links: []
created: 2026-09-16T15:30:34Z
type: feature
priority: 1
assignee: Adam Gross
tags: [core]
---
# Gauntlet feasibility as a hard constraint on every recommendation

Rules 8 and 9 eliminate an entry that reaches a holiday leg unable to field a team. Ten Thanksgiving teams, eight Christmas teams, six shared, twelve in the union. Feasibility is a two-slot matching and Hall's condition is a four-line check. See docs/research/05-future-value-and-constraints.md.

## Acceptance Criteria

A state holding exactly one team from the union of twelve is infeasible and the recommender refuses rather than warns. A state holding one Thanksgiving-only team and one Christmas-only team is feasible. The team lists are read from a single named constant sourced to rules 8 and 9.

