---
id: 4
title: Take Win % only from sportsbook moneylines, as the median of per-book de-vigged probabilities
date: 2026-09-14
status: accepted
decided_by: human
supersedes: null
superseded_by: null
verified_at: null
---

## Context

Earlier versions of Jamie's planner fell back to a spread conversion or a language model when a
moneyline was missing, and read one book. Recorded in commits `11c0d28` and `e092602`, which
are Jamie's decisions and predate the fork.

## Decision

The win probability for a game this week comes only from two-sided moneylines. Each book's
pair is de-vigged on its own by multiplicative normalization, the consensus is the median of
the books' home probabilities, and the away side is its complement. A quote taken after
kickoff, or more than 48 hours older than the freshest book, is excluded. Three or more books
is a consensus, two is degraded, one is provisional. Spreads and power ratings project future
weeks only and never produce this week's Win %.

## Consequences

- EV needs a Win % for most games of a leg. Below 75 percent coverage it is blanked.
- The de-vig method is multiplicative until measured otherwise. Whether power or Shin
  calibrates better on lopsided lines is open, see `fs-ta9j`.

## Alternatives rejected

**Spread or model fallback when a moneyline is missing.** Removed in `11c0d28`, because it
mixed a market probability with a modeled one in the same column.

**A single book.** Replaced in `e092602` by the five-book median, so one stale or off-market
book cannot move the number alone.
