---
id: 1
title: Settle the objective on paper before writing any code, and carry the standard portfolio doc set
date: 2026-09-16
status: accepted
decided_by: owner
supersedes: null
superseded_by: null
verified_at: null
---

## Context

Jamie has a working dashboard that scores each week's teams on win probability, future value
and pick popularity, and it is being used on three live 2026 Circa Survivor entries. Its
formulas were fit by hand, the popularity model is acknowledged to overfit recent weeks, the
future-value term is not derived from anything anyone can now reconstruct, and the weekly
field data is typed in from a photograph. The 2026 season is already one week old.

The obvious move is to start fixing the pipeline, and it is the wrong one. The first hour of
reading the official rules found that the payout rule has four branches rather than one, and
the first hour of arithmetic found that the standard survivor-pool expected-value formula
misorders candidates by a factor that varies by an order of magnitude across the field. Both
are above the line in the sense of `~/.claude/CLAUDE.md`: they change the information model,
not the code. Building on either would have meant building the wrong thing quickly.

The owner asked for a research project, explicitly no coding.

## Decision

Phase 1 is documents only. Nothing is implemented until `docs/research/` answers what the
objective is, what the inputs are, and how the pick is computed, and until those answers have
decision records.

The repository carries the standard portfolio doc set from the start: `CLAUDE.md`,
`VISION.md`, `STATE.md`, `docs/decisions/`, and a `tk` queue in `.tickets/`.
`ARCHITECTURE.md` is deliberately absent until there is architecture to describe, because a
template full of placeholders is worse than nothing.

The kickoff transcript moves to `docs/kickoff-transcript.txt` and stays as the record of what
was asked for. Its auto-generated summary reverses the speakers, attributing Jamie's
dashboard and Jamie's asks to Adam, and that is noted rather than edited, because the
transcript is a source document. It is stored with a `.txt` extension rather than `.md`
deliberately: it is verbatim third-party text, not prose this project wrote, and the
portfolio's prose hook correctly declines to hold it to section 9.

## Consequences

- The Week 2 pick, due Saturday 2026-09-19, is made without any of this. That is accepted.
- Research findings that contradict the current dashboard are recorded as findings, not as
  changes. Jamie owns the dashboard, and nothing here modifies it.
- The project appears in `/portfolio-review` from this commit, since it is now a git
  repository with a `.tickets/` queue. It will grade as a documents project until phase 2.
- Phases 2 through 5 in `VISION.md` are sequenced so that ingest and replay come before any
  optimizer, which means the first code written is the code that makes every later claim
  checkable.

## Alternatives rejected

**Start with the data pipeline, since the availability files turned out to be machine
readable.** Tempting, and it is the highest-value single piece of work. Rejected because the
parser's acceptance criteria depend on what the field model needs, and that was not known
until the research was done. It is now ticket `fs-*` and is first in line.

**Retrofit Jamie's dashboard directly.** Rejected. We do not have it, it is not ours, and the
finding in `docs/research/02-objective-function.md` is that its expected-value column is
ordering candidates incorrectly, which is a rewrite rather than a patch.

**Skip the doc set and keep this as loose notes in the vault.** Rejected. There is a live
season, three entries, a syndicate, and a second engineer, so this needs a ticket queue and a
state file, not a pile of markdown.
