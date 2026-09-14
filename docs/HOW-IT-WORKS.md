# How the planner works (v1.7)

## Legs
20 legs per Circa rules: NFL Weeks 1–18 plus a Thanksgiving leg (Wed–Fri games) and a Christmas leg (Dec 24–25),
each with its own pick. Each team once per entry. Tie = loss. Schedule is hard-coded in `LEGS`.

## Refresh (Planner tab)
Two calls to the Anthropic API (Claude Sonnet + web search), parsed leniently (`extract()`):
1. Selected leg: spread + de-vigged win % per team, plus a pick-popularity guess and its `src`.
2. Power ratings for all 32 teams → projected spreads for every future cell (italic) and the Future column.

## P% (pick popularity) — one number per leg, chosen automatically
- Leg has Circa actuals (`ACTUALS`) → use them.
- Otherwise blend two guessers, weighted by their error on past legs (`sourceErrors`, `modelWeight`):
  - **Field model** `modelPick`: `win^a · e^(−b·FV) · availability`, normalized over favored teams.
    `a`, `b` fit by grid search against every leg with actuals (`fitParams`).
  - **Search**: whatever the refresh returned.
- Click the "P% = …" button for the per-team audit table.

## EV
`EV = W / (P + Σ over other games of P·W)`, then scaled so the pick-weighted average = 1.00 (Atlas / SurvivorGrid convention).

## Future value
Sum over legs *after* the selected one of max(0, projected win − 0.60).

## Actuals tab
`CONTEST` + `ACTUALS` are transcribed by hand from Circa's weekly selections image. `fieldTimeline()` derives live entries,
implied value per entry (pool ÷ live), and equity (5% × 3 entries × value, zeroed for busted entries).

## Weekly loop
1. Tue: select new leg → Refresh.  2. Day before deadline: Refresh again.  3. Set 3 picks, check dupes, enter at Circa.
4. After lock: add Circa's selections to `ACTUALS` (picks, won, lost, pending). 5. After MNF: update won/lost.
