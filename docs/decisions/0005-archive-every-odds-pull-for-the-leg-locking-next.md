---
id: 5
title: Archive every odds pull, raw and per leg, as its own never-overwritten file
date: 2026-09-23
status: accepted
decided_by: agent, on the owner's go-ahead for fs-rs6a
supersedes: null
superseded_by: null
verified_at: null
---

## Context

`fetch-odds.mjs` overwrites each game's quotes on every pull and keeps one previous set, so
the lines a pick was made on are gone by the next pull, and no recommendation can be replayed.
The decision input is the last pull before each leg's deadline. Storage layout cannot be
refactored later, because files already written keep the shape they were written in.

## Decision

Every pull writes one file, `data/archive/odds/<leg>/<pulledAt>.json`, with colons in the
timestamp replaced by hyphens. It holds `source`, the requested `books`, `pulledAt`, `legId`,
`deadline`, and `games`: The Odds API's game objects for that leg exactly as the response
carried them. The leg is the one whose deadline is next after the pull. A file is never
rewritten, and the update job commits new files beside the old ones.

Replay reads a leg's files, takes the last one pulled before the deadline, and de-vigs at read
time through the same `oddsGameFromApi` and `linesFromOdds` the live page uses. A snapshot
pulled at or after the deadline raises.

## Consequences

- Any de-vig method or book set can be scored against what was known at each deadline.
- About 29 KB per file before git's compression, 2 KB after. Around 20 pulls a week keep a
  season near 10 MB of working tree.
- Later legs' early lines are not archived. Line movement before a leg is next is lost.
- The update job carries `data/archive` through its reset-and-replay commit step.

## Alternatives rejected

**Archive the whole response.** Keeps early lines for later legs, at two to three times the
size, for a question nothing yet asks.

**Append to one file per leg.** Fewer files, but every pull rewrites the file, which breaks
the never-rewritten property and conflicts when two runs race.

**Store the parsed per-book shape of `odds.json`.** Smaller, but it is our parse and not the
bytes, so a parser bug would be baked into the archive.
