# How the planner works (v2.0)

## Legs
20 legs per Circa rules: NFL Weeks 1–18 plus a Thanksgiving leg (Wed–Fri games) and a Christmas leg (Dec 24–25),
each with its own pick. Each team once per entry. Tie = loss. Schedule is hard-coded in `src/schedule.js`.

## Data (all files in `data/`, all in the repo)
- **Lines** (`odds.json`): a GitHub Action calls The Odds API twice a day for DraftKings moneylines and spreads on
  every upcoming game and files each under its Circa leg. A game is only overwritten while it is still upcoming, so
  each game keeps the last pre-kickoff line seen.
- **True Win %** is computed in the app from the two raw moneylines (`devig`): implied = 100/(ML+100) or −ML/(−ML+100),
  then the two sides are normalized to sum to 100%. No spread or model fallback: a game without valid two-sided
  moneylines has no Win %.
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
