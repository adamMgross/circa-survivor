---
id: fs-mgyt
status: open
deps: []
links: []
created: 2026-09-16T15:29:52Z
type: owner
priority: 3
assignee: Adam Gross
tags: [access]
---
# Odds API access on a tier that includes historical snapshots

Historical odds snapshots for featured markets go back to mid-2020 on the paid tier, which covers every Circa Survivor season. Without them, every backtest either uses closing lines, which nobody could have acted on, or does not exist. This is the one purchase the project needs.

## Acceptance Criteria

A key is available to this machine, a snapshot at a past Saturday 4:00 PM PT deadline has been retrieved and archived, and the cost per season of backfill is recorded.


## Notes

**2026-09-23T23:30:26Z**

Reprioritized 2026-09-23 from P1 to P3: calibration uses free nflverse history (fs-ta9j) and current snapshots come from the existing key (fs-rs6a). Paid history only matters for deadline-time 2024-2025 backtests.
