import { ALL_TEAMS } from "../schedule.js";
import { lineFor, marketLine } from "./lines.js";
import { computeEV, computeDili, fvFor } from "./value.js";
import { modelPick } from "./popularity.js";

export function computeStats(legId, data, params) {
  const act = data.actuals[legId];
  const actTot = act ? Object.values(act.picks).reduce((a, b) => a + b, 0) : 0;
  const modelP = modelPick(legId, data, params);
  const hasModel = Object.keys(modelP).length > 0;
  const pick = act ? Object.fromEntries(Object.entries(act.picks).map(([t, n]) => [t, n / actTot])) : modelP;
  const rows = {};
  for (const t of ALL_TEAMS) {
    const mk = marketLine(legId, t, data);          // True Win % (market only), null if no valid two-sided ML
    const disp = lineFor(legId, t, data);           // spread for display, may be a projection
    rows[t] = { win: mk ? mk.win : null, ml: mk ? mk.ml : null, oppMl: mk ? mk.oppMl : null, status: mk ? mk.status : "none", n: mk ? mk.n : 0, refBook: mk ? mk.refBook : null,
      pick: (act || hasModel) ? (pick[t] ?? (disp ? 0 : null)) : null, spread: disp ? disp.spread : null, proj: disp ? disp.proj : false, pm: modelP[t], act: !!act };
  }
  const ev = computeEV(legId, rows);
  for (const t of ALL_TEAMS) rows[t].fv = data.ratings ? fvFor(legId, t, data) : null;
  return { rows, ev };
}

// Stats for the selected leg, with deltas against the previous refresh and the best five in each ranked column.
export function boardStats(legId, data, params, burned, style) {
  const cur = computeStats(legId, data, params);
  const k = computeDili(legId, cur.rows, data, burned, style);
  const prev = data.prev ? computeStats(legId, data.prev, params) : null;
  if (prev) {
    computeDili(legId, prev.rows, data.prev, burned, style);
    for (const t of ALL_TEAMS) {
      const a = cur.rows[t], b = prev.rows[t];
      a.dEv = a.ev != null && b.ev != null ? a.ev - b.ev : null;
      a.dWin = a.win != null && b.win != null ? a.win - b.win : null;
      a.dPick = !a.act && a.pick != null && b.pick != null ? a.pick - b.pick : null;
      a.dDili = a.dili != null && b.dili != null ? a.dili - b.dili : null;
    }
  }
  // mark the best five in each of the three ranked columns
  const TOP = 5;
  for (const [key, flag] of [["dili", "diliTop"], ["ev", "evTop"], ["win", "winTop"]])
    ALL_TEAMS.filter((t) => cur.rows[t][key] != null).sort((a, b) => cur.rows[b][key] - cur.rows[a][key]).slice(0, TOP).forEach((t) => { cur.rows[t][flag] = true; });
  return { ...cur, k };
}
