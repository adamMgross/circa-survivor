---
id: fs-9x8g
status: open
deps: [fs-gkjt]
links: []
created: 2026-09-16T15:30:52Z
type: task
priority: 2
assignee: Adam Gross
tags: [ingest]
---
# Reconstruct eliminated entries' picks from consecutive availability files

Availability files list survivors only, so the losing side of each week is not recorded. An entry present in week w and absent in week w+1 was eliminated in week w and must have picked a losing team available to it. Where exactly one losing team was available, the pick is identified. Where several were, the choice model fills it in by expectation-maximization. The eliminated entries carry the entire signal about which picks the field makes badly, so this is not a nicety.

## Acceptance Criteria

Recovered picks reconcile against published elimination counts, starting with the Chargers at 7,585 in Week 1 2026. Entries whose pick is not uniquely identified are marked as such rather than guessed.

