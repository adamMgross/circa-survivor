---
id: fs-2crt
status: closed
deps: []
links: []
created: 2026-09-16T15:29:52Z
type: owner
priority: 1
assignee: Adam Gross
tags: [access]
---
# Get access to Jamie's dashboard, its formulas, and its backtest

The research pass claims the dashboard's expected-value column misorders candidates (docs/research/02-objective-function.md, finding 2). That claim is about a formula nobody in this repo has read. It could be wrong, and it cannot be graded without the source.

## Acceptance Criteria

The repository or export is readable from here, the three pillar formulas are written down as they actually are, and the existing backtest's inputs and results are available.


## Notes

**2026-09-23T23:30:26Z**

Closed 2026-09-23: the planner is forked into this repository, and its three pillars are in src/CircaSurvivorPlanner.jsx, src/ratings.js and scripts/. Jamie's earlier backtest of the win-probability formula and popularity model is not in the repository and can be asked for if the harness wants it.
