---
id: cs-q2qb
status: open
deps: [cs-l0oa]
links: []
created: 2026-09-23T23:29:52Z
type: craft
priority: 2
assignee: Adam Gross
tags: [craft, perf]
---
# Hoist the (a, b)-independent terms out of fitParams and pin the fit by counted work

fitParams evaluates modelPick 920 times per leg with actuals, and each call recomputes availability (O(legs^2) over the field timeline) and fvFor for every favored team, though neither depends on a or b. It runs on every data change in a useMemo, then again in modelError and computeStats. At season end that is about 18,000 modelPick calls per load.

## Acceptance Criteria

availability is computed once per leg and fvFor once per team per leg per fit, a test counts those evaluations and fails on regression, and the fitted a, b and error are unchanged on the real data.

