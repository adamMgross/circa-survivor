# circa-survivor

The Circa Survivor planner and the strategy research behind it: what the contest pays, what
that makes us maximize, and how to compute the weekly pick. Forked from Jamie's planner by
decision 0002, which also ended the documents-only phase of decision 0001.

This repo follows `~/.claude/CLAUDE.md` in full. This file adds only what is specific to this
repo and not derivable from the documents.

## Reading order

1. `README.md` and `docs/HOW-IT-WORKS.md`: what the app does and how its data jobs run.
2. `VISION.md`: the problem, the goals, and the phases.
3. `docs/research/README.md`: the ten findings, then the numbered documents in order.
4. `STATE.md`: Current State, then the newest Log entries.
5. `docs/decisions/README.md`: index. Read the record before revisiting the choice it holds.
6. `tk ready`: what to work on.

`docs/kickoff-transcript.txt` is a source document and is never edited.

## Who is who

Jamie built the planner this repository forks, holds the contest relationship, and is Speaker A in the
transcript. Adam owns the algorithm, the data, and the validation, and is Speaker B. Jeremy
holds roughly 55 percent of the economics and is the risk principal. The transcript's
auto-generated summary reverses the speakers. Trust the transcript body, not its summary.

## Commands

```bash
npm install
npm test         # bundles and runs every suite in test/
npm run dev      # http://localhost:5173
npm run build
tk ready
```

The data jobs in `scripts/` run on GitHub Actions and need `ODDS_API_KEY`, and
`fetch-actuals.mjs` needs `pdftotext` from poppler.

## Remotes

`origin` is `adamMgross/circa-survivor`. `upstream` is Jamie's `mfe-labs/circa-survivor`,
fetch only, with its push URL set to `DISABLE`. Never push, open a pull request, or file an
issue there. Upstream is not synced, and a wanted fix is copied by hand.

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
