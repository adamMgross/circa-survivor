---
id: fs-9x8g
status: open
deps: [fs-gkjt, cs-kd2q]
links: []
created: 2026-09-16T15:30:52Z
type: feature
priority: 1
assignee: Adam Gross
tags: [ingest]
---

# Persist per-entry selections and join them across weeks

Circa's Selections PDF labels every entry's pick, losers included, and `parseSelections` already returns the per-entry map, but fetch-actuals keeps only per-team counts and our own three names. Joining the entries across weeks gives each surviving entry's exact used set, which replaces the `availability()` estimate that assumes a team's burn is independent of later survival. Inference is needed only where a name is truncated or ambiguous.

## Acceptance Criteria

Per-entry used sets reproduce actuals.json per-team counts for every leg and the aggregate row of Circa's availability PDF for the same week. Truncated or colliding names are marked unresolved, never guessed. The field availability the model reads comes from the join.
