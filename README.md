# Circa Survivor 2026 Planner

Interactive planner for three Circa Survivor entries (CIRCAmcised-2/3/4): 20-leg pick grid with cross-outs,
EV / win % / pick % per leg, spreads in every cell, future value, and an Actuals tab tracking the whole contest field.

Built as a claude.ai artifact; this repo wraps the same component so it runs locally.

## Run locally
```
npm install
cp .env.example .env      # add your Anthropic API key (needed only for the Refresh button)
npm run dev               # http://localhost:5173
npm test                  # parser tests
```

## Layout
- `src/CircaSurvivorPlanner.jsx` — the artifact, unchanged. This is the file that goes back and forth with Claude.
- `src/main.jsx` — local wrapper: `window.storage` shim (localStorage) + API proxy routing.
- `data/` — Circa selections images and your exported state (`state-export.json`).
- `test/` — parser tests and a headless-browser end-to-end test (`python3 test/e2e.py` after `npm run build`; needs playwright).
- `docs/HOW-IT-WORKS.md` — the model, in plain terms.

## Preserving state
The component keeps picks and pulled data in `window.storage`, not in the file. Use **Export** in the app after each
session and save the JSON to `data/state-export.json`; use **Import** to restore.
