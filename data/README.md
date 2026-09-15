# data/

All app state lives here, as JSON, in the repo. Nothing is stored anywhere else.

- `picks.json` — the three entries' picks. Written by the app when the owner clicks a cell.
- `actuals.json` — contest size and Circa's posted selections + results per leg. Written by the `update-actuals` GitHub Action (Circa's Selections PDF + ESPN scoreboard); the app's Actuals editor can override.
- `odds.json` — raw moneylines + spreads per book (Pinnacle, BetMGM, DraftKings, FanDuel, Caesars) per leg and game. Written by the `update-data` GitHub Action.
- `ratings.json` — power ratings fit from market spreads. Written by the same Action.
- `week1-circa-selections.png` — Circa's posted Week 1 selections, the source of the Week 1 actuals.
