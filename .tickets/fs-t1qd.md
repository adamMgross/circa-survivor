---
id: fs-t1qd
status: closed
deps: []
links: []
created: 2026-09-16T15:29:52Z
type: owner
priority: 1
assignee: Adam Gross
tags: [access]
---
# Confirm the three 2026 entry aliases as they appear in Circa's availability file

Circa's weekly availability file lists every live entry by alias. Knowing our own three aliases makes the official record of what we have used machine-checkable against the dashboard, which matters because rule 15(a) disqualifies an entrant for a repeat pick and Circa explicitly refuses to backstop its own software on it.

## Acceptance Criteria

Three alias strings recorded, each verified to match a row in the current week's file.


## Notes

**2026-09-23T23:30:26Z**

Closed 2026-09-23: the aliases are CIRCAmcised-2, CIRCAmcised-3 and CIRCAmcised-4 in data/picks.json, matched by name against Circa's Selections PDF by scripts/fetch-actuals.mjs for Weeks 1 and 2. Checking them against the availability PDF moves to fs-gkjt.
