import { ALL_TEAMS } from "../schedule.js";
import { lineFor, marketLine } from "./lines.js";
import { computeEV, computeExactEV, computeDili, fvFor } from "./value.js";
import { fieldSize } from "./field.js";
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
  const { rows: evRows, ...ev } = computeEV(legId, rows);
  const alive = fieldSize(legId, data);
  const counts = act ? act.picks : Object.fromEntries(ALL_TEAMS.map((t) => [t, Math.round((rows[t].pick || 0) * alive)]));
  const exact = computeExactEV(legId, rows, counts);
  const out = {};
  for (const t of ALL_TEAMS) out[t] = { ...evRows[t], ...(t in exact ? { evx: exact[t] } : {}), fv: data.ratings ? fvFor(legId, t, data) : null };
  return { rows: out, ev };
}

// Stats for the selected leg, with deltas against the previous refresh and the best five in each ranked column.
export function boardStats(legId, data, params, burned, style) {
  const cur = computeStats(legId, data, params);
  const { k, rows: diliRows } = computeDili(legId, cur.rows, data, burned, style);
  const prevRows = data.prev ? computeDili(legId, computeStats(legId, data.prev, params).rows, data.prev, burned, style).rows : null;
  const TOP = 5;
  const top = (key) => new Set(ALL_TEAMS.filter((t) => diliRows[t][key] != null).sort((a, b) => diliRows[b][key] - diliRows[a][key]).slice(0, TOP));
  const flags = [["dili", "diliTop"], ["ev", "evTop"], ["evx", "evxTop"], ["win", "winTop"]].map(([key, flag]) => [flag, top(key)]);
  const rows = {};
  for (const t of ALL_TEAMS) {
    const a = diliRows[t], b = prevRows?.[t];
    rows[t] = { ...a, ...(b ? {
      dEv: a.ev != null && b.ev != null ? a.ev - b.ev : null,
      dEvx: a.evx != null && b.evx != null ? a.evx - b.evx : null,
      dWin: a.win != null && b.win != null ? a.win - b.win : null,
      dPick: !a.act && a.pick != null && b.pick != null ? a.pick - b.pick : null,
      dDili: a.dili != null && b.dili != null ? a.dili - b.dili : null,
    } : {}) };
    for (const [flag, set] of flags) if (set.has(t)) rows[t][flag] = true;
  }
  return { rows, ev: cur.ev, k };
}
