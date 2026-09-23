---
id: cs-h96l
status: open
deps: []
links: []
created: 2026-09-23T23:29:52Z
type: craft
priority: 3
assignee: Adam Gross
tags: [craft]
---
# Pass the clock into defaultLeg and fit-ratings, and strip the comment essays

defaultLeg and fit-ratings read Date.now inside decisions. Rationale essays and history comments sit at the popularity prior, the holiday dock, openLeg, the fetch-odds legacy upgrade and both data workflows, which fail the one test in ~/.claude/CLAUDE.md section 6.

## Acceptance Criteria

No model or script function reads the clock except at its entry point, and every comment left passes the one test.

