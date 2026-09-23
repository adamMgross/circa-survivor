---
id: fs-rs6a
status: open
deps: [fs-mgyt]
links: []
created: 2026-09-16T15:30:14Z
type: feature
priority: 1
assignee: Adam Gross
tags: [ingest]
---
# Archive an odds snapshot at every decision deadline, and backfill history

The decision input is the Saturday 4:00 PM PT line, earlier for the two holiday legs. A backtest on closing lines measures a strategy nobody could have run. See docs/research/03-inputs-win-probability.md.

## Design

Store every book's raw price, not a pre-aggregated consensus, with the snapshot timestamp. De-vig at read time, never at write time, so the method stays a tunable the backtest can score.

## Acceptance Criteria

A snapshot exists for every remaining 2026 contest week, taken before its deadline and timestamped. Historical snapshots backfilled for the seasons the availability archive covers. A replay handed a snapshot later than its deadline raises.

