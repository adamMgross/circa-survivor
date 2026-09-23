---
id: cs-hu2d
status: open
deps: [cs-l0oa]
links: []
created: 2026-09-23T23:29:52Z
type: craft
priority: 2
assignee: Adam Gross
tags: [craft, tests]
---
# Move the tests to node --test with fixtures instead of the live data files

test/run.mjs is a hand-rolled ok() runner over execSync, so the first failing suite hides the rest. test/model.test.jsx imports data/*.json, which the bots rewrite several times a day, so its results change with every commit, and 'top team within 6 pts of actual' blesses current output rather than an invariant. Its comment says the prior is 8 / 1.5 where the code says 8 / 0.15.

## Acceptance Criteria

npm test runs node --test over every suite and reports every failure. No test imports data/. Every existing invariant check survives as a test on a fixture.

