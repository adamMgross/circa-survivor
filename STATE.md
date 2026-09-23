# State

Read Current State first. The Log is append-only, newest last, and is corrected forward with
a new entry, never edited. When Current State grows past two screens, rewrite it
holistically. Entries marked upstream were seeded from Jamie's git history at onboarding.

## Current State

**Phase:** onboard and extract, per `VISION.md`. The layout is in place. Next is
`cs-l0oa`, moving the model out of `src/CircaSurvivorPlanner.jsx` with the tests untouched,
which gates the exact EV, holiday feasibility, the likelihood fit and derived future value.

**Deployed vs main:** matches. https://adammgross.github.io/circa-survivor/ is served from
`main` by `deploy.yml`, and the lines, ratings and actuals jobs run on schedule on the fork
with its own `ODDS_API_KEY`, first verified by run 35933411028 on 2026-09-23.

**What works, verified 2026-09-23:** `npm test` passes 105 checks across eight suites and
`npm run build` succeeds. The app is Jamie's v2.0 apart from the repository name. The lines
pull priced 32 games at DraftKings and FanDuel, 16 at BetMGM and Pinnacle, none at Caesars.

**What the season is doing:** after Week 2, 8,610 of 25,017 entries are alive, a Week 2
field survival of 0.507. Only CIRCAmcised-2 is ours, having used DET and SF, with KC planned
for Week 3. CIRCAmcised-3 lost on LAC and CIRCAmcised-4 on TB. The Week 3 deadline is
Saturday 2026-09-26 at 4:00 PM PT, and the last lines pull before it is Saturday's 14:17 UTC
run (`cs-unkn`).

**What the model gets right and wrong:** EV is `w / E[survivors | win]`. Against exact
enumeration on the real fields it is within a few percent but under-credits non-chalk picks
and reorders the top candidates (`fs-0d0o`). On the Week 3 slate, with the fitted popularity
model, KC still ranks first for CIRCAmcised-2 both ways, and its lead over SEA roughly halves.
Future value and DILI rest on about nine hand-set constants (`cs-c584`). No raw input is
archived, so no recommendation can be replayed (`fs-gkjt`, `fs-rs6a`).

**Blockers:** none for the craft and model queue. Owner decisions gate the endgame.

**Open questions:**

- The objective for CIRCAmcised-2 and which app's pick wins when the two disagree, `fs-d7a3`.
- Circa's reading of rule 19(d)(iv) on the final-week split, `cs-a6be`.
- Why Caesars returns no lines, `cs-qr7x`.

**Untested assumptions:**

| Assumption | Confidence | Settled by |
|---|---|---|
| Market beats public models on NFL win probability | medium, widely held | `fs-ta9j` |
| Power or Shin de-vig beats multiplicative on lopsided lines | medium | `fs-ta9j` |
| Games within a week are near-independent | low | `fs-qar4` |
| Selections names join cleanly across weeks despite truncation | low, never joined | `fs-9x8g` |
| The 20 legs in `src/schedule.js` match the published schedule | medium, agrees with research 05, Weeks 1 and 2 ran | `fs-yc7e` |
| Field behavior is stable enough to pool across seasons | low | `fs-ri3y`, `fs-fnhf` |
| ESPN's undocumented scoreboard keeps its shape | medium, two weeks parsed | none yet |
| Circa keeps its Selections URL convention | medium, two weeks found | `fs-gkjt` |

## Log

### 2026-09-14 (upstream)

**Done:** Jamie took the planner from a Claude artifact (v1.7) to v2.0 in one day. Win %
became two-sided no-vig moneylines with the spread and language-model fallbacks removed, then
the median of five books de-vigged separately. State moved into JSON files in the repository,
served by GitHub Pages, with scheduled Actions pulling lines from The Odds API and backfilling
closing lines from nflverse, and a ridge fit of power ratings from market spreads. The
popularity fit started weighting misses by actual pick share with a prior on its two knobs.

**Decisions:** 0003 data in the repository, 0004 Win % from moneylines only. Rejected the
artifact runtime, its Anthropic calls, and export and import.

### 2026-09-15 (upstream)

**Done:** Circa actuals automated, picks from the weekly Selections PDF and results from
ESPN's scoreboard. The owner's visit refreshes lines older than ten hours. Deltas since the
previous refresh, and the data jobs keep one prior set of quotes and ratings for them. The DILI
column, EV net of a future forfeit with Now, Balanced and Future styles and a calendar
schedule. A design pass on the board.

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

### 2026-09-16 (upstream)

**Done:** future value redefined as the expected number of strong-favorite weeks left, and the
popularity knobs rescaled to it. Selection styling on the board.

### 2026-09-17 (upstream)

**Done:** DILI gained a holiday scarcity dock for Thanksgiving and Christmas eligible teams,
then doubled. The best five W%, EV and DILI are highlighted, a cheap Future green and a crowded
P% red. README rewritten and `/guide.html` added.

### 2026-09-18 (upstream)

**Done:** `/math.html`, each of the six models with its formula and a worked example.

### 2026-09-20 (upstream)

**Done:** the data jobs retry transient network failures. The page opens on the first week
whose results are not final.

### 2026-09-22 (upstream)

**Done:** the popularity fit's prior measured each knob against a plausible spread instead of
its own size, which had frozen `b`, and the math page updated for the refit parameters. Week
2 final: CIRCAmcised-3 and CIRCAmcised-4 eliminated.

### 2026-09-23

**Done:** read Jamie's planner in full and checked its EV against exact enumeration on the
real Week 1, 2 and 3 slates. Forked it to `adamMgross/circa-survivor`, pointed the app at the
fork, disabled pushes to `upstream`, and merged the football-survivor research repository
in with its history.

**Decisions:** 0002, fork the planner, merge the research, end the documents-only phase.

**Left unfinished:** enabling Actions and Pages on the fork and adding `ODDS_API_KEY`, which
need the owner. `VISION.md`, the untested-assumptions table and the stale tickets
(`fs-2crt`, `fs-t1qd`, `fs-d7a3`) are not yet revised for what the app turned out to be.

### 2026-09-23 (onboarding)

**Done:** onboarded to the portfolio layout with `/project-init`. `VISION.md` rewritten for a
code project, `ARCHITECTURE.md` written from the code with a Shape section, `CLAUDE.md` moved
to the template. Decisions 0003 and 0004 extracted from Jamie's history. The fork's Actions,
Pages and `ODDS_API_KEY` configured by the owner, and the first lines run and deploy verified.
Tickets: `fs-2crt` and `fs-t1qd` closed, fourteen research tickets rewritten, reprioritized or rewired
against the code, and twelve created, among them seven craft.

**Findings:** delivery was Red on arrival because `VISION.md` and the research stated facts the
code contradicts: a photo-typed field, a pinned tenth-power exponent, a dashboard that
aggregates before de-vigging, `a/p` as its EV, and three live entries. Craft is Yellow. The
pure pieces are good (`consensusForGame`, `parseSelections`, `resultsFromScoreboard`,
`fetchRetry`) but live in a UI file, mutate shared rows, and the popularity fit recomputes
`availability` and `fvFor` 920 times per leg although neither depends on the fitted knobs.
The evening lines pull lands 17 minutes after the Saturday lock under daylight saving.

**Left unfinished:** the research documents themselves are not revised (`cs-91lt`). Nothing
pushed, per the onboarding rule.
