---
id: fs-frk2
status: open
deps: []
links: [fs-gkjt]
created: 2026-09-16T15:30:52Z
type: chore
priority: 3
assignee: Adam Gross
tags: [ingest]
---
# Find the availability files the URL probe missed

2025 weeks 1, 7 and 8 returned 404 on every month directory tried, and nothing before 2024 was probed. Every missing week is a missing slice of the backtest corpus.

## Acceptance Criteria

Either the files are found and archived, or the naming variants tried are recorded so nobody probes the same dead ends twice.

