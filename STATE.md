# State

Read Current State first. The Log is append-only, newest last, and is corrected forward with
a new entry, never edited. When Current State grows past two screens, rewrite it
holistically.

## Current State

**Phase:** the documents-only research phase ended with decision 0002. This repository is a
fork of Jamie's planner with the research merged in. `VISION.md` still describes the
documents-only plan and is due a holistic rewrite during portfolio onboarding.

**Deployed vs main:** the fork is at `adamMgross/circa-survivor` and points the app at its
own data files. Its Actions, Pages, and `ODDS_API_KEY` secret are not configured yet, so
nothing is deployed from the fork and its data jobs do not run.

**What works, verified 2026-09-23:** `npm test` passes 105 checks across eight suites and
`npm run build` succeeds. The app is Jamie's v2.0 unchanged apart from the repository name.

**What the season is doing:** after Week 2, 8,610 of 25,017 entries are alive. Only
CIRCAmcised-2 is ours (DET, SF, KC planned for Week 3). CIRCAmcised-3 lost on LAC and
CIRCAmcised-4 lost on TB. The Week 3 deadline is Saturday 2026-09-26 at 4:00 PM PT.

**What the app's model gets right and wrong:** its EV is `w / E[survivors | win]`, within a
few percent of exact enumeration on the real Week 1 and Week 2 fields, but it under-credits
non-chalk picks enough to reorder the top candidates. On the Week 3 slate KC still ranks
first for CIRCAmcised-2 under both. Future value and DILI rest on nine hand-set constants.
Research finding 2 criticizes `a/p`, which the app does not use.

**Next:** onboard to the portfolio layout, then extract the model from
`src/CircaSurvivorPlanner.jsx` with the tests untouched, then exact EV (`fs-0d0o`).

**Blockers:** the fork's GitHub settings and API key need the owner.

## Log

### 2026-09-16

**Done:** project created from the kickoff transcript. Standard doc set, `tk` queue with 18
tickets, decision 0001, and a seven-document research pass in `docs/research/` covering
contest mechanics, the objective function, both inputs, future value and constraints,
solution methods, and validation, with an annotated bibliography.

**Decisions:** 0001, research before code, with the standard doc set. `ARCHITECTURE.md`
deliberately omitted until there is architecture to describe.

**Findings:** the ten are in `docs/research/README.md`. The three that change what gets built:

Rule 19(d) has four payout branches, not one. A lone survivor takes the whole pot, and a week
that wipes out the entire field pays everyone who was alive. The transcript knows neither.

The objective is `E[W/|S|]`, and the folklore `a/p` formula is Clair and Letscher's exact
answer to a different problem, a one-game pool whose two cohorts partition the field. Scored
against the real Week 1 2026 field it overstates the contrarian edge by a factor of twenty-six
and it does so unevenly across candidates, so the ordering is wrong, not the scale. The
corollary is that contrarian play is worth a few percent early and a hundredfold late, which
inverts the season shape both speakers assumed in the transcript.

Circa publishes the full field every week as a PDF at a predictable URL, with every live entry
by alias and every team it has used, going back to at least 2024. The project's stated worst
friction, typing numbers out of a tweeted photo, does not need to exist, and the same files are
a backtest corpus of tens of thousands of entry-weeks with the choice set attached to every
observation.

**Also found:** the field is 5,250 decision-makers rather than 17,000 independent entries, and
58 percent of the ten-entry aliases whose entries all survived Week 1 put all ten on one team.
Circa takes no rake, so the average entry is worth exactly its $1,000 fee. The one-week
expectation is exactly computable by convolution over the slate in microseconds, so the only
sampling needed is over the field's choices and the continuation value.

**Left unfinished:** the Bergman and Imbrogno primary text was not obtained and its eight-week
horizon result is cited from a university press summary. PoolGenius returned 403 to every
automated fetch, so the closest public statement of the right framework went unread. Circa's
2021 and 2022 results exist only as Twitter images. Layout-based parsing of the per-entry grid
was tried and found to silently produce wrong numbers, which is recorded as a trap in
`CLAUDE.md` and as an acceptance criterion on `fs-gkjt`, but no working parser was written,
because phase 1 is documents only.

### 2026-09-23

**Done:** read Jamie's planner in full and checked its EV against exact enumeration on the
real Week 1, 2 and 3 slates. Forked it to `adamMgross/circa-survivor`, pointed the app at the
fork, disabled pushes to `upstream`, and merged the football-survivor research repository
in with its history.

**Decisions:** 0002, fork the planner, merge the research, end the documents-only phase.

**Left unfinished:** enabling Actions and Pages on the fork and adding `ODDS_API_KEY`, which
need the owner. `VISION.md`, the untested-assumptions table and the stale tickets
(`fs-2crt`, `fs-t1qd`, `fs-d7a3`) are not yet revised for what the app turned out to be.
