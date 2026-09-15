# How the planner works (v2.0)

## Legs
20 legs per Circa rules: NFL Weeks 1–18 plus a Thanksgiving leg (Wed–Fri games) and a Christmas leg (Dec 24–25),
each with its own pick. Each team once per entry. Tie = loss. Schedule is hard-coded in `src/schedule.js`.

## Data (all files in `data/`, all in the repo)
- **Lines** (`odds.json`): a GitHub Action calls The Odds API twice a day (2 credits per pull) for moneylines and
  spreads from Pinnacle, BetMGM, DraftKings, FanDuel and Caesars on every upcoming game, and files each book's raw
  quotes under the game's Circa leg. A game is never overwritten once it has kicked off, so it keeps the last
  pre-kickoff quotes seen. Games that kicked off before they were ever captured are backfilled with nflverse's
  closing moneyline, for history and model fitting only; the backfill never touches an upcoming game.
- **True Win %** is computed in the app, per game: each book's two prices are de-vigged on their own (implied =
  100/(ML+100) or −ML/(−ML+100), normalized to sum to 100%), the consensus is the **median** of the books' home-win
  probabilities, and the away side is 1 − home (medians of the two sides need not sum to 1). Status: 3+ books =
  normal, 2 = degraded, 1 = single-book (provisional, shown in amber), 0 = unavailable. A quote is excluded if it
  lacks both prices, was taken after kickoff (in-game), or is more than 48 h older than the freshest book's quote.
  No spread, rating or model fallback ever produces a Win %.
- **EV** needs a Win % for every game in the leg to be exact; games without one drop out of the denominator and
  flatter the rest. With partial coverage EV is still shown but the column is marked `EV*` with the coverage in its
  tooltip; below 75% coverage EV is blanked.
- **Power ratings** (`ratings.json`): fit by the same Action from market spreads. Every 2026 game with a closing
  line (nflverse) plus the current DraftKings spreads is an equation `home − away + 2 = spread`; a ridge fit solves
  for one number per team, shrunk toward last season's ratings early in the year. Ratings project spreads for every
  future cell (italic) and drive the Future column.
- **Picks** (`picks.json`) and **Circa actuals** (`actuals.json`) are written by the app when the owner is signed in.

## P% (pick popularity), one number per leg
- Leg has Circa actuals → use them.
- Otherwise the **field model** `win^a · e^(−b·FV) · availability`, normalized over favored teams; `a`, `b` fit by
  grid search against every leg with actuals. Click the "P% = …" button for the per-team audit table.

## EV
`EV = W / (P + Σ over other games of P·W)`, then scaled so the pick-weighted average = 1.00 (Atlas / SurvivorGrid convention).

## Future value
Sum over legs *after* the selected one of max(0, projected win − 0.60).

## Actuals tab
Contest size + Circa's posted selections per leg. `fieldTimeline()` derives live entries, implied value per entry
(pool ÷ live), and equity (share × entries alive × value).

## Weekly loop
1. Lines refresh themselves; check the grid any time. 2. Set 3 picks (signed in), check dupes, enter at Circa.
3. After lock: Actuals → Enter results, type Circa's selections (picks, won, lost, pending). 4. After MNF: edit the leg, update won/lost.
