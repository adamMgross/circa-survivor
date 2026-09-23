---
id: cs-8zgr
status: open
deps: [cs-l0oa]
links: []
created: 2026-09-23T23:29:52Z
type: craft
priority: 2
assignee: Adam Gross
tags: [craft]
---
# Name the game key and the pick source, and take NOPICK out of the team map

Game keys are the string AWAY@HOME re-split in several places, NOPICK is a sentinel mixed into the team-keyed pick counts, and whether P% was observed or modeled is a boolean threaded through the board. Each is a closed value that should be named once.

## Acceptance Criteria

One constructor and one parser for game keys, a closed pick-source value dispatched exhaustively, and no-picks counted outside the team map, with the parity script passing.

