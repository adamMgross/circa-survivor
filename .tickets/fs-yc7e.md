---
id: fs-yc7e
status: open
deps: []
links: []
created: 2026-09-16T15:30:52Z
type: chore
priority: 3
assignee: Adam Gross
tags: [research]
---

# Test the 20 legs in src/schedule.js against the nflverse 2026 schedule

docs/research/05-future-value-and-constraints.md maps the twenty contest weeks onto the NFL calendar, placing the Thanksgiving leg inside NFL week 12 and the Christmas leg inside NFL week 16. That mapping is inferred from the dates in rules 8, 9 and 11 plus the 2026 calendar, not stated anywhere. Future value, the gauntlet constraint, and the whole planning horizon depend on it.

## Acceptance Criteria

Every one of the twenty contest weeks is tied to its NFL week and its game set from the published schedule, and the document is corrected if the inference was wrong.


## Notes

**2026-09-23T23:30:26Z**

Rescoped 2026-09-23: the mapping is encoded in src/schedule.js and espnWeek in scripts/circa.mjs, and agrees with docs/research/05 lines 67-73. What remains is a test that pins it to the published schedule.
