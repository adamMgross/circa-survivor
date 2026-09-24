# State

Read Current State first. The Log is append-only, newest last, and is corrected forward with
a new entry, never edited. When Current State grows past two screens, rewrite it
holistically. Entries marked upstream were seeded from Jamie's git history at onboarding.

## Current State

**Phase:** in season, per `VISION.md`. The model lives in `src/model/` as values. The exact
EV, holiday feasibility, the deadline odds archive and the likelihood field model are in. Next
is deciding what the exact EV should replace (`fs-d7a3`), then derived future value
(`cs-c584`) and archiving Circa's files (`fs-gkjt`).

**Deployed vs main:** matches after the 2026-09-23 push. https://adammgross.github.io/circa-survivor/
is served from `main` by `deploy.yml`, and the lines, ratings and actuals jobs run on schedule
on the fork with its own `ODDS_API_KEY`. The odds archive and the prediction record ran on
GitHub on 2026-09-24, and the archived W3 snapshot replays to the live page's Win % exactly.

**What works, verified 2026-09-23:** `npm test` exits 0 with 234 checks across thirteen
suites, `npm run build` succeeds, and the board renders the Exact column with no errors in
Chrome. `npm run parity` against the pre-extraction commit found every output identical.

**What the season is doing:** after Week 2, 8,610 of 25,017 entries are alive. Only
CIRCAmcised-2 is ours, having used DET and SF, with KC planned for Week 3. The Week 3 deadline
is Saturday 2026-09-26 at 4:00 PM PT, and the last lines pull before it is Saturday's 22:17
UTC run, 43 minutes before the lock.

**What the model says about Week 3, on lines as of 2026-09-23 23:24 UTC:** among teams
CIRCAmcised-2 still holds, the linearized EV ranks KC 1.07, BUF 1.01, SEA 0.99, and the exact
EV ranks BUF 1.05, KC 1.03, SEA 1.02. DILI still discounts the linearized EV and ranks KC
first. No Week 3 pick breaks holiday feasibility. The likelihood field model and Jamie's both
put about 45 percent of the field on KC.

**What the model gets right and wrong:** the exact EV matches brute-force enumeration and is
shown beside Jamie's, which stays the baseline and still feeds DILI. The likelihood fit beat
Jamie's on a retro Week 2 (1.632 against 1.652 nats per entry, chalk 2.972), but that retro
used closing lines and today's ratings, so Week 3 is the first deadline-clean score. Future
value and DILI rest on about nine hand-set constants (`cs-c584`). Circa's files are not yet
archived (`fs-gkjt`), and the field model's future-value feature uses today's ratings for past
weeks.

**Blockers:** none for the craft and model queue. Owner decisions gate the endgame.

**Open questions:**

- The objective for CIRCAmcised-2, which app's pick wins when the two disagree, and whether
  DILI should discount the exact EV, `fs-d7a3`.
- Circa's reading of rule 19(d)(iv) on the final-week split, `cs-a6be`.
- Why Caesars returns no lines, `cs-qr7x`.

**Untested assumptions:**

| Assumption | Confidence | Settled by |
|---|---|---|
| Market beats public models on NFL win probability | medium, widely held | `fs-ta9j` |
| Power or Shin de-vig beats multiplicative on lopsided lines | medium | `fs-ta9j` |
| Games within a week are near-independent | low | `fs-qar4` |
| GitHub starts the 22:17 UTC Saturday pull before the 23:00 lock | low, the 23:17 run of 2026-09-23 started 2 h 5 min late | none yet |
| Selections names join cleanly across weeks despite truncation | low, never joined | `fs-9x8g` |
| The 20 legs in `src/schedule.js` match the published schedule | medium, agrees with research 05, Weeks 1 and 2 ran | `fs-yc7e` |
| Field behavior is stable enough to pool across seasons | low | `fs-fnhf` |
| Entries pick independently, so the likelihood standard errors hold | low, syndicates exist | none yet |
| Ties are rare enough to leave out of the exact EV | medium | `fs-0d0o` notes |
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

### 2026-09-23 (cs-unkn)

**Done:** every leg now has a `deadline` in `src/schedule.js`, taken from rules 12 and 13 of
the 6/19/2026 rules (re-fetched, sha256 `9c51eee5...`). A new 22:17 UTC cron on September
and October Saturdays puts a lines pull 43 minutes before each daylight-time lock. The existing
23:17 UTC pull already covers every lock from November 1 on, the Thanksgiving and Christmas
legs included. `test/deadlines.test.jsx` checks each deadline against the rule in Las Vegas
time and each leg's hour before its lock against the workflow's cron lines. It failed on W1
to W8 before the cron change.

**Left unfinished:** a GitHub scheduled run can start late, and one run is the only pull in
each hour before a lock. The post-lock 23:17 pull still overwrites `data/odds.json` on
daylight-time Saturdays, which `fs-rs6a` addresses by archiving the deadline snapshot.

### 2026-09-23 (cs-l0oa)

**Done:** the model moved from `src/CircaSurvivorPlanner.jsx` into `src/model/` as five
modules (`lines`, `field`, `value`, `popularity`, `board`), with `computeStats` and the
board's deltas and top-five flags lifted out of the component body as `boardStats`. The
ticket's `project.js` and `data.js` were folded into `lines.js` rather than left as shallow
modules. The move commit left `test/` untouched. The next commit repointed the tests to
`src/model/` and removed the component's re-exports. `npm run parity -- <ref>` compares the
model at a ref with the working tree on the same data. Against `eeafebb` it found 3,648 of
3,648 outputs identical, and it fails on a change of one part in ten million to `SURVIVE`.
The server-rendered page is byte-identical to `eeafebb` on the same data and clock.

**Left unfinished:** `openLeg` still defaults its clock to `Date.now()` (`cs-h96l`), and
`computeEV` and `computeDili` still mutate the rows they are given (`cs-ascn`).

### 2026-09-23 (cs-ascn, fs-0d0o, fs-i6c3, fs-rs6a, fs-ri3y)

**Done:** `computeEV`, `computeDili` and `boardStats` return new rows, parity-checked at 3,648
of 3,648 outputs and a byte-identical page. The exact EV is `w * E[N / (n + 1 + Z)]` by
convolution, shown as an Exact column, matching brute force and reproducing the Week 1 and
Week 2 orderings from a fixture. Holiday feasibility refuses picks by Hall's condition on
`HOLIDAY_TEAMS`, taken from rules 8a and 9a. Every lines pull archives the raw games of the
leg locking next (decision 0005), and a replay refuses a snapshot taken at or after the
deadline. The field model is fit by multinomial likelihood beside Jamie's fit and a chalk
baseline, and each leg's prediction is recorded before its deadline and scored by log loss.

**Findings:** on Week 3 the exact EV puts BUF ahead of KC for CIRCAmcised-2, where the
linearized EV and DILI put KC first.

**Left unfinished:** the page's P% and DILI still use Jamie's fit and EV. Ties are not in the
exact EV. The archive and the prediction record have not run on GitHub yet, so the first
scheduled run after the push is the check. The Actuals view and audit panel were not clicked
through in a browser.

### 2026-09-24

**Done:** a manual `update-data.yml` run (36004975159) archived 16 W3 games and wrote
`data/predictions/W3.json`. `deadlineSnapshot` chose it over the earlier scheduled file, and
its replay matches `odds.json` W3 on every team.

**Findings:** the scheduled 23:17 UTC lines run of 2026-09-23 started at 01:22 UTC, 2 h 5 min
late. A delay that long on Saturday would put the 22:17 pull after the 23:00 lock.
