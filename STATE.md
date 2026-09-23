# State

Read Current State first. The Log is append-only, newest last, and is corrected forward with
a new entry, never edited. When Current State grows past two screens, rewrite it
holistically.

## Current State

**Phase:** 1 of 5, research, documents only by decision 0001. `docs/research/` holds the
answer to what the contest pays, what that makes us maximize, what the inputs must be, and
how the pick is computed. No code exists and none should be written yet.

**Deployed vs main:** nothing is deployed. There is no runtime, no test suite, and no build.

**What works, verified 2026-09-16:** the research pass is complete and every factual claim in
it was verified live against a primary source during the pass. The official 2026 rules PDF was
fetched and read in full. The Circa weekly team-availability file was fetched for 2026 Week 2,
2025 Weeks 2 to 6 and 9 to 18, and spot-checked for 2024, and its aggregate row was parsed:
16,978 entries alive, 16 distinct availability sets, Jacksonville used by 8,127 surviving
entries. Season winner files for 2023 to 2025 were fetched and the entry counts and implied
field survival rates derived from them. Clair and Letscher (2007) and the March Madness
multi-entry paper were read in the relevant sections.

**What the season is doing:** the 2026 contest is one week old. 25,017 entries, a $25,017,000
pool, no rake. Week 1 killed 8,039 entries, a field survival rate of 0.679 that lands exactly
on the 2023 to 2025 mean of 0.677. The Chargers took 7,585 entries down with them, 30.3
percent of the field in one game and the largest single-pick loss Circa has recorded. Carrying
the historical survival rate forward puts 2026 at roughly ten survivors and a season-ending
split near $2.5M per entry, so the modal outcome is a split, not a lone winner.

**The Week 2 deadline is Saturday 2026-09-19 at 4:00 PM PT.** Nothing here is required to make
that pick and nothing here is built. Jamie's dashboard makes it.

**Blockers:** the four owner tickets are all real gates. `fs-mgyt` blocks every backtest,
`fs-2crt` blocks the benchmark this project claims to beat, `fs-d7a3` changes the
recommendation itself, and `fs-t1qd` is a correctness check against rule 15(a).

**Open questions:**

- Is the dashboard's expected-value column actually a product or ratio of win probability and
  pick popularity? The claim in `docs/research/02-objective-function.md` that it misorders
  candidates is about a formula nobody here has read. `fs-2crt`.
- Does the availability archive reach back before 2024, and where are 2025 Weeks 1, 7 and 8?
  `fs-frk2`.
- Is the inferred mapping of the twenty contest weeks onto the NFL calendar right? `fs-yc7e`.
- Does the syndicate want expected value or something concave? `fs-d7a3`.

**Untested assumptions:**

| Assumption | Confidence | Settled by |
|---|---|---|
| Market beats public models on NFL win probability | medium, widely held, no head-to-head found | `fs-ta9j` |
| Power or Shin de-vig beats multiplicative on lopsided lines | medium, secondary sources agree | `fs-ta9j` |
| Games within a week are near-independent | low | `fs-qar4` |
| Availability files exist for every week back to 2023 | low, three 2025 weeks not found | `fs-frk2` |
| The 2026 NFL week mapping of the holiday legs | medium, inferred from rules 8, 9, 11 | `fs-yc7e` |
| Aliases are stable identifiers across weeks | medium, pattern is consistent, never joined | `fs-gkjt` |
| Field behavior is stable enough to pool across seasons | low | `fs-ri3y` |
| An eight-week horizon transfers from a survival objective | low, different objective | `fs-zj45` |
| The 58 percent single-team concentration figure | medium, real but selection-biased upward | `fs-gkjt` |

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
