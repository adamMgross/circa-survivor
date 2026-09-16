# football-survivor

The analytical half of a Circa Survivor entry: what the contest pays, what that makes us
maximize, and how to compute the weekly pick. The one rule that matters most here is that
this project is currently documents only, by decision 0001. Do not write code.

This repo follows `~/.claude/CLAUDE.md` in full. This file adds only what is specific to this
repo and not derivable from the documents.

## Reading order

1. `VISION.md`: the problem, the goals, and the phases.
2. `docs/research/README.md`: the ten findings, then the numbered documents in order.
3. `STATE.md`: Current State, then the newest Log entries.
4. `docs/decisions/README.md`: index. Read the record before revisiting the choice it holds.
5. `tk ready`: what to work on.

`docs/kickoff-transcript.txt` is a source document and is never edited.

## Who is who

Jamie built and owns the dashboard, holds the contest relationship, and is Speaker A in the
transcript. Adam owns the algorithm, the data, and the validation, and is Speaker B. Jeremy
holds roughly 55 percent of the economics and is the risk principal. The transcript's
auto-generated summary reverses the speakers. Trust the transcript body, not its summary.

## Commands

No build, no test suite, no runtime. There is nothing to run yet, and phase 2 in `VISION.md`
is where that changes.

```bash
tk ready
```

## Session protocol

Start: read `STATE.md` Current State, run `tk ready`, `tk start <id>`.

End: `tk close <id>` or `tk add-note <id>` with what remains, append a dated entry to the
`STATE.md` Log, refresh Current State, commit. A non-trivial decision gets a record in
`docs/decisions/` in the same commit. Anything only the owner can resolve becomes
`tk create ... -t owner`. Push when done.

## Invariants

Breaking one of these is a defect, not a tradeoff.

- **The objective is the payout rule, not a proxy.** Rule 19(d) has four branches and
  `docs/research/02-objective-function.md` writes them as one function. Survival probability,
  expected weeks survived, and win probability over pick share are diagnostics. None of them
  is the objective, and `a/p` is not even a monotone transform of it.
- **No input that postdates the deadline.** The decision deadline is Saturday 4:00 PM PT,
  earlier for the two holiday legs. Closing lines, next week's availability file, and injury
  news that broke on Sunday are look-ahead. Any replay given them raises.
- **Raw before parsed.** Circa's files are a convention, not an API, and they can change or
  disappear. Archive the bytes, parse from the archive.
- **Numbers come from sources or from arithmetic shown.** No estimate is presented with
  confidence when it was not measured. `docs/research/07-validation-and-backtesting.md` keeps
  the untested-assumptions table and it is updated, not appended to.

## Traps

- **The contest is at Circa, and Circa can rewrite the rules.** Rule 30 says so explicitly
  and puts the burden on the entrant. Re-fetch and diff the rules file rather than trusting
  a cached reading of it, including the one in `docs/research/01-contest-mechanics.md`.
- **A tie is a loss** (rule 6a), and **a missed pick is elimination** (rules 12, 13). Both
  are live elimination modes, not edge cases.
- **A repeat pick disqualifies the entrant, and Circa refuses to backstop its own software
  on it** (rule 15a). Availability tracking is a correctness requirement.
- **Layout-based PDF parsing of the availability file silently produces wrong numbers.** It
  was tried during the research pass and reported Jacksonville at 4,106 against the file's
  own 8,127. Parse with word positions and assert against the aggregate row.
- **The availability file lists survivors only.** Eliminated entries vanish, so the losing
  side of each week has to be reconstructed by set difference, not read off.
- **The 2026 NFL week numbering of the two holiday legs is inferred**, from the dates in
  rules 8, 9 and 11 and the 2026 calendar. It is not stated in the rules. Verify it against
  the published schedule before anything depends on it.
