# Circa Survivor 2026 Planner

Live site: **https://mfe-labs.github.io/circa-survivor/**

Planner for three Circa Survivor entries: 20-leg pick grid, EV / True Win % / pick % per leg, spreads in every cell,
future value, and an Actuals tab tracking the whole contest field. Friends can view; the owner signs in to edit.

Everything runs for free on GitHub: the site is GitHub Pages, the data files live in this repo, and a scheduled
GitHub Action keeps the betting lines fresh. There is no server and no database.

## How the pieces fit
- `src/CircaSurvivorPlanner.jsx` — the app. Reads the four data files below, and writes picks/actuals back to the
  repo through the GitHub API when the owner is signed in.
- `data/picks.json` — the three entries' picks. Written by the app.
- `data/actuals.json` — contest size + Circa's posted selections per leg (entries per team, won/lost/pending). Written by the app.
- `data/odds.json` — DraftKings moneylines and spreads per leg/game. Written by the `update-data` workflow.
- `data/ratings.json` — power ratings fit from market spreads. Written by the `update-data` workflow.
- `scripts/fetch-odds.mjs`, `scripts/fit-ratings.mjs` — the two data jobs (The Odds API + nflverse).
- `src/schedule.js` — the 2026 schedule grouped into Circa's 20 legs. Shared by the app and the scripts.
- `.github/workflows/deploy.yml` — tests, builds and publishes the site on every push to `main`.
- `.github/workflows/update-data.yml` — twice a day: pull lines, refit ratings, commit, redeploy.

## Editing (owner)
1. Click **Sign in to edit** and paste a GitHub fine-grained personal access token
   (GitHub → Settings → Developer settings → Fine-grained tokens): repository `mfe-labs/circa-survivor` only,
   permissions **Contents: read & write** and **Actions: read & write**. The token stays in your browser.
2. Click cells to set picks. Each change is committed to the repo within a second.
3. After a leg locks, open **Actuals → Enter … results** and type Circa's numbers from the selections image.
4. **Update lines now** runs the lines job immediately instead of waiting for the schedule.

Every save is a git commit, so the full history of picks and results is in `git log`.

## Run locally
```
npm install
npm run dev      # http://localhost:5173 (viewer mode; sign in the same way to edit)
npm test
```
To run the data jobs locally: `ODDS_API_KEY=… node scripts/fetch-odds.mjs && node scripts/fit-ratings.mjs`.

## Secrets
`ODDS_API_KEY` (The Odds API, free tier) is a repository Actions secret. Nothing else is needed.
