---
id: fs-gkjt
status: open
deps: [cs-kd2q]
links: [fs-frk2]
created: 2026-09-16T15:30:14Z
type: feature
priority: 1
assignee: Adam Gross
tags: [ingest]
---

# Archive raw Selections and availability PDFs with hashes, and parse from the archive

fetch-actuals downloads each Selections PDF to a temporary directory and discards it after parsing, so no past week can be re-parsed and the raw-before-parsed invariant does not hold. Circa's availability PDF is not fetched at all, though it is the independent check on the field. The 2024 and 2025 files are the backtest corpus. See docs/research/04-inputs-field-model.md.

## Design

Store bytes under a content-addressed path with source URL, retrieval time and SHA-256, parse from the stored bytes, and keep observed, inferred and unresolved labels distinct (review finding S3). Parse the availability grid with word positions, never column offsets in a flattened rendering, which reported Jacksonville at 4,106 against the file's own 8,127.

## Acceptance Criteria

2026 Weeks 1 and 2 parse from archived bytes. The availability PDF's per-entry rows reproduce its own aggregate row team by team, and the 2026 Week 2 file yields 16,978 entries and Jacksonville at 8,127. A file that fails parity raises. 2024 and 2025 archived as far as files exist.
