---
id: fs-rs6a
status: open
deps: [cs-unkn]
links: []
created: 2026-09-16T15:30:14Z
type: feature
priority: 1
assignee: Adam Gross
tags: [ingest]
---

# Archive a timestamped per-book odds snapshot before every deadline

fetch-odds overwrites each game on every pull and keeps one previous set, so the lines a decision was made on are gone by the next pull. The decision input is the last snapshot before the deadline, Saturday 4:00 PM PT and earlier for the holiday legs. Historical deadline snapshots for 2024 and 2025 need the paid tier in fs-mgyt and are out of scope here.

## Design

Append each pull's raw per-book prices with its timestamp to an archive that is never overwritten. De-vig at read time so the method stays something the backtest can score.

## Acceptance Criteria

Every remaining 2026 leg has an archived snapshot taken before its deadline, and a replay handed a snapshot later than the deadline raises.
