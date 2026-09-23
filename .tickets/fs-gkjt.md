---
id: fs-gkjt
status: open
deps: []
links: [fs-frk2]
created: 2026-09-16T15:30:14Z
type: feature
priority: 1
assignee: Adam Gross
tags: [ingest]
---
# Archive and parse Circa availability files, 2024 to date

Circa publishes the full field weekly at a predictable URL: the aggregate availability row plus every live entry by alias with its used teams. This is the joint state every survivor tool has to guess at, and it is the project's stated biggest friction. See docs/research/04-inputs-field-model.md.

## Design

Fetch and archive raw bytes first, parse from the archive. Parse the per-entry grid with word positions from the PDF text layer, not with column offsets in a flattened rendering: the flattened approach was tried during the research pass and reported Jacksonville at 4,106 against the file's own 8,127. Emit typed records, not tuples: an AvailabilitySet per entry, an alias identity, a contest week.

## Acceptance Criteria

Every archived file parses. Per-entry rows reproduce the file's own aggregate availability row exactly, team by team, as a hard assertion at ingest. The 2026 Week 2 file yields 16,978 entries, 16 distinct availability sets, and Jacksonville at 8,127. A file that fails parity raises rather than warns.

