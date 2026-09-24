---
id: cs-l0oa
status: closed
deps: []
links: []
created: 2026-09-23T23:29:52Z
type: craft
priority: 1
assignee: Adam Gross
tags: [craft, refactor]
---
# Extract the model from CircaSurvivorPlanner.jsx into src/model/ with the tests untouched

Every model function lives in the 1,220-line UI file next to the CSS and JSX, computeStats is defined inside the component body so it cannot be tested without React, and the tests import the model through the UI module. Every model ticket below edits these functions, so they move first, as a pure behavior-preserving change.

## Design

src/model/lines.js (impliedProb, devig, median, STATUS, consensusForGame, linesFromOdds), project.js (normCdf, erf, winFromMargin, projected, lineFor, marketLine), field.js (fieldTimeline, availability, entryStatus, openLeg), popularity.js (modelPick, fitParams, modelError, prior constants), value.js (computeEV, fvFor, futureForfeit, holidayScarcity, computeDili, STYLE, calendarWeight), data.js (buildData), board.js (computeStats lifted out plus the deltas and top-five flags as boardStats). The component keeps state, saves, sorting, layout, CSS and editors, and re-exports its current export list so test/ is untouched in this commit.

## Acceptance Criteria

A parity script runs the pre-refactor commit and the new tree on the real data files for every leg, every style and every entry's burned set, and fitParams, modelError, boardStats rows, openLeg, fieldTimeline and availability are exactly equal. npm test passes with test/ unchanged.


## Notes

**2026-09-24T00:58:43Z**

Landed as five modules, not seven: project.js and data.js folded into lines.js, which is the line for a team in a leg from market or ratings, because each alone was a shallow module. The model imports src/ratings.js for HFA. Parity: npm run parity against eeafebb gave 3648/3648 identical outputs (buildData, fitParams, modelError, fieldTimeline, openLeg hourly over the season, availability and boardStats for every leg, style and entry burned set), and it catches a 1e-7 change to SURVIVE. The server-rendered page is byte-identical to eeafebb on the same data and clock. Tests were untouched in the move commit and repointed to src/model/ in the next.
