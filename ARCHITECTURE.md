# Architecture

A static React page on GitHub Pages over four JSON files in `data/`. Scheduled GitHub Actions
fetch sportsbook lines, nflverse game data, Circa's weekly Selections PDF and ESPN results,
reduce them to those files, commit, and redeploy. The page reads the files, runs every model
in the browser on each load, and writes picks back through the GitHub API when the owner signs
in. There is no server.

```
 The Odds API --+                                   +--> data/odds.json ----+
 nflverse csv --+--> scripts/fetch-odds.mjs --------+                       |
                +--> scripts/fit-ratings.mjs -----------> data/ratings.json -+
                                                                            |
 Circa PDF -----+--> scripts/fetch-actuals.mjs ---------> data/actuals.json -+--> Pages build
 ESPN json -----+    (pdftotext, circa.mjs parser) -----> data/picks.json  --+        |
                                                              ^                     v
                                                              |      CircaSurvivorPlanner.jsx
                                                              +------ owner save   (model + UI)
                                                                  via GitHub API
```

## Modules

- `src/schedule.js`: the 2026 schedule as 20 Circa legs, team names, aliases, the holiday
  team sets. Shared by the page and the scripts. Knows nothing about odds or picks.
- `src/ratings.js`: the ridge fit of power ratings from spreads, and the futures prior.
  Pure.
- `src/CircaSurvivorPlanner.jsx`: every model function (de-vig and consensus, projection,
  field timeline and availability, popularity model and its fit, EV, future value, DILI, entry
  status) and the whole UI, CSS and editors, in one file. `computeStats` and the board's
  deltas and top-five flags are defined inside the component body.
- `src/github.js`: read and write the data files and dispatch a workflow through the GitHub
  REST API.
- `scripts/fetch-odds.mjs`, `fit-ratings.mjs`, `fetch-actuals.mjs`: the scheduled jobs, each
  fetching, transforming and writing in one top-level body.
- `scripts/circa.mjs`: pure parsers for the Selections text and ESPN's scoreboard.
  `scripts/nflverse.mjs` loads `games.csv`. `scripts/http.mjs` retries transient failures.
- `public/guide.html`, `public/math.html`: static explainers served beside the app.

## Data flow

Raw bytes become typed values in three places: `consensusForGame` for per-book moneylines,
`parseSelections` for the `pdftotext -layout` rendering of Circa's PDF, and
`resultsFromScoreboard` for ESPN. After that the model passes plain objects keyed by team
abbreviation and by the string `"AWAY@HOME"`. Values become storage format only in the three
scripts and in the owner's save, each writing a whole JSON file.

## External systems

| System | Purpose | Auth | Verified |
|---|---|---|---|
| The Odds API | Per-book moneylines and spreads, Super Bowl futures | `ODDS_API_KEY` secret, free tier 500 credits a month | 2026-09-23 |
| nflverse `games.csv` | Closing lines and results for backfill and ratings | none | 2026-09-23 |
| Circa Selections PDF | Every entry's pick per leg, at a conventional URL | none | 2026-09-22 |
| ESPN scoreboard | Game results, a tie is a loss | none, undocumented | 2026-09-22 |
| GitHub API, Pages, Actions | Storage, owner writes, hosting, schedules | fine-grained token for writes | 2026-09-23 |

Licenses of the nflverse data and of Circa's files have not been checked.

## Storage

All four files are overwritten in place by each run, and history lives only in `git log`.
`odds.json` keeps each game's latest pre-kickoff quotes plus one `prev` set and never
overwrites a game after its kickoff. `ratings.json` keeps the latest fit and one `prev`.
`actuals.json` holds per-team pick counts and results per leg, not per-entry picks. The
downloaded PDFs are written to a temporary directory and discarded.

## Build, run, deploy

`npm test` bundles each suite in `test/` with esbuild and runs it. `npm run build` produces
`dist/` for Pages. `deploy.yml` tests and publishes on every push to `main`.
`update-data.yml` pulls lines and refits ratings at 14:17 and 23:17 UTC, and at 22:17 UTC on
September and October Saturdays, so a pull lands in the hour before every leg's deadline.
The deadlines are `deadline` on each leg in `src/schedule.js`, and `test/deadlines.test.jsx`
checks the cron lines against them.
`update-actuals.yml` runs the Circa and ESPN job every three hours. Both data jobs commit to
`main` and dispatch the deploy.

## Shape

What the code holds to today. Each is checkable in the named place.

- Win % for a leg comes only from `marketLine`, which reads a consensus of moneylines. No
  spread, rating or model fallback produces one (decision 0004).
- `consensusForGame`, `linesFromOdds`, `fitRatings`, `priorFromFutures`, `parseSelections`
  and `resultsFromScoreboard` are pure and take their inputs as arguments. `openLeg` takes
  the clock as an argument that defaults to `Date.now()`.
- A game that has kicked off is never overwritten by `fetch-odds.mjs`.
- A tie is a loss in `resultsFromScoreboard`, and a no-pick is a loss in `fetch-actuals.mjs`.
- `src/schedule.js` is the only definition of legs, deadlines, teams and the holiday sets,
  shared by the page and the scripts.
- A scheduled lines pull lands in the hour before every leg's deadline
  (`test/deadlines.test.jsx`).

Not yet held, each with a ticket: model functions separate from the UI (`cs-l0oa`), rows
returned as values instead of mutated (`cs-ascn`), raw inputs archived before parsing
(`fs-gkjt`, `fs-rs6a`), named game keys and pick sources (`cs-8zgr`), and a counted-work pin
on the popularity fit (`cs-q2qb`).
