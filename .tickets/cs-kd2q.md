---
id: cs-kd2q
status: open
deps: []
links: []
created: 2026-09-23T23:29:52Z
type: craft
priority: 2
assignee: Adam Gross
tags: [craft]
---
# Split fetch-actuals into fetch, a pure nextActuals transform, and write

scripts/fetch-actuals.mjs locates, downloads, parses, counts no-picks, overwrites the owner's picks, fetches results and writes in one top-level loop, and fetch-odds.mjs braids its merge, a legacy-shape upgrade and the nflverse backfill the same way. The per-entry selections work and the raw archive both need a pure seam here.

## Acceptance Criteria

nextActuals(prev, parsed, results) and the odds merge are pure functions with tests on fixture text and JSON, and the scripts only fetch, call them and write.

