# circa-survivor

The Circa Survivor planner and the strategy research behind it: what the contest pays, what
that makes us maximize, and how to compute the weekly pick. Forked from Jamie's planner by
decision 0002. The rule that matters most: every model change is measured against Jamie's
current formulas, which stay runnable as the named baseline.

This repo follows `~/.claude/CLAUDE.md` in full. This file adds only what is specific to this
repo and not derivable from the code.

## Reading order

1. `VISION.md`: problem, goals (utility and craft), non-goals, settled scope.
2. `ARCHITECTURE.md`: modules, data flow, external systems, and the Shape the code holds to.
3. `STATE.md`: Current State, then the newest Log entries.
4. `docs/decisions/README.md`: index of decision records. Read one before revisiting the
   choice it records.
5. `tk ready`: what to work on.

Domain documentation: `docs/research/README.md` for the contest math and the ten findings
(being revised, `cs-91lt`), `docs/arch-review/` for the principal review of that research,
`docs/HOW-IT-WORKS.md` and `public/math.html` for the app's formulas as Jamie wrote them.
`docs/kickoff-transcript.txt` is a source document and is never edited.

## Who is who

Jamie built the planner this repository forks, runs his own copy, submits the syndicate's
picks at Circa, and is Speaker A in the transcript. Adam owns this fork, the model, the data
and the validation, and is Speaker B. Jeremy holds roughly 55 percent of the economics and is
the risk principal. The transcript's auto-generated summary reverses the speakers. Trust the
transcript body, not its summary.

## Commands

```bash
npm install
npm test         # bundles and runs every suite in test/
npm run dev      # http://localhost:5173
npm run build
tk ready
```

The data jobs in `scripts/` need `ODDS_API_KEY` and, for `fetch-actuals.mjs`, `pdftotext`
from poppler. On GitHub they run from `.github/workflows/`.

## Session protocol

Start: `git pull --rebase`, read `STATE.md` Current State, run `tk ready`, `tk start <id>`.

End: `tk close <id>` (or `tk add-note <id>` with what remains), append a dated entry to the
`STATE.md` Log, refresh Current State, commit. A non-trivial decision gets a record in
`docs/decisions/` in the same commit. Anything only the owner can resolve becomes
`tk create ... -t owner`. Push when done, which redeploys the live site.

## Invariants

Breaking one of these is a defect, not a tradeoff.

- **The objective is the payout rule, not a proxy.** Rule 19(d) has four branches. Survival
  probability, expected weeks survived, and win probability over pick share are diagnostics.
- **Jamie's formulas stay runnable as the baseline.** A replacement ships beside the formula
  it replaces, with a parity or comparison test, before the old one is removed from the page.
- **No input that postdates the deadline.** The deadline is Saturday 4:00 PM PT, earlier for
  the two holiday legs. Closing lines, next week's Circa files, and Sunday injury news are
  look-ahead. Any replay given them raises.
- **Raw before parsed.** Circa's files are a convention, not an API. Archive the bytes, parse
  from the archive. Not yet held by `fetch-actuals.mjs`, see `fs-gkjt`.
- **Numbers come from sources or from arithmetic shown.** No estimate is presented with
  confidence when it was not measured.

## Remotes

`origin` is `adamMgross/circa-survivor`. `upstream` is Jamie's `mfe-labs/circa-survivor`,
fetch only, with its push URL set to `DISABLE`. Never push, open a pull request, or file an
issue there. Upstream is not synced, and a wanted fix is copied by hand.

## Traps

- **Bots commit to `main` every few hours.** The lines, ratings and actuals jobs push data
  commits, so pull before pushing, and a local branch goes stale within hours.
- **`test/model.test.jsx` reads the live `data/*.json`,** so its numbers change with every
  bot commit. A failure there after a pull can be the data, not the change (`cs-hu2d`).
- **The evening lines pull lands after the Saturday lock** while Pacific time is on daylight
  saving (`cs-unkn`). The last lines before each deadline are the morning pull's.
- **`gh secret set` cannot prompt inside a Claude session.** Without a terminal it reads
  standard input and stores whatever it gets, including an empty string. Set secrets from a
  real terminal.
- **The contest is at Circa, and Circa can rewrite the rules** (rule 30). Re-fetch and diff
  the rules file rather than trusting a cached reading, including
  `docs/research/01-contest-mechanics.md`.
- **A tie is a loss** (rule 6a), and **a missed pick is elimination** (rules 12, 13).
- **A repeat pick disqualifies the entrant, and Circa refuses to backstop its own software
  on it** (rule 15a). Availability tracking is a correctness requirement.
- **Layout-based parsing of the availability PDF silently produces wrong numbers.** It
  reported Jacksonville at 4,106 against the file's own 8,127. Parse with word positions and
  assert against the aggregate row. The Selections PDF is a different layout and
  `parseSelections` handles it.
- **The availability file lists survivors only.** The Selections file lists every pick,
  losers included, and is the source for who picked what.
