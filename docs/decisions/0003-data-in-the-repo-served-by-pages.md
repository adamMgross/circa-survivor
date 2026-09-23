---
id: 3
title: Keep all state as JSON in the repository, served by GitHub Pages and updated by Actions
date: 2026-09-14
status: accepted
decided_by: human
supersedes: null
superseded_by: null
verified_at: null
---

## Context

Jamie's planner before v2.0 ran as a Claude artifact. It called the Anthropic API for search
based pick percentages, went through a dev proxy, kept state in `window.storage`, and moved
data between sessions with an in-page export and import. Recorded in commit `24d6dd6`, which
is Jamie's decision and predates the fork.

## Decision

Every piece of state is a JSON file in `data/`: picks, Circa actuals, per-book odds and power
ratings. The site is static and served by GitHub Pages. Scheduled Actions write the odds,
ratings and actuals files and redeploy. The page writes picks and actuals overrides through
the GitHub Contents API when the owner signs in with a fine-grained token. Viewers read only.

## Consequences

- There is no server, no database and no cost beyond the free Odds API tier.
- Every save and every data refresh is a git commit, so history is `git log`.
- Bots push to `main` every few hours, so local work must pull before it pushes.
- Each file is overwritten per run. Anything a replay needs from a past moment has to be
  archived separately, because the current file only holds the latest state.

## Alternatives rejected

**The artifact runtime with Anthropic calls and export/import.** Removed in `24d6dd6`. It
needed a proxy, its storage lived in one browser, and search-based pick percentages were not
Circa's numbers.
