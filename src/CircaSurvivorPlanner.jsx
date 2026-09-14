import { useState, useEffect, useMemo, useRef } from "react";
import { LEGS, ALL_TEAMS, OPP, TG_TEAMS, XM_TEAMS, legLabel } from "./schedule.js";
import { HFA } from "./ratings.js";
import { REPO, readFile, writeFile, whoAmI, dispatchWorkflow } from "./github.js";
// Bundled copies of the data files (built into the site on every deploy). The page also re-reads the
// live files from the repo on load so viewers see saves made since the last deploy.
import picksBundled from "../data/picks.json";
import actualsBundled from "../data/actuals.json";
import oddsBundled from "../data/odds.json";
import ratingsBundled from "../data/ratings.json";

const VERSION = "2.0";
const TOKEN_KEY = "csp-github-token";
const PATHS = { picks: "data/picks.json", actuals: "data/actuals.json", odds: "data/odds.json", ratings: "data/ratings.json" };
const BUNDLED = { picks: picksBundled, actuals: actualsBundled, odds: oddsBundled, ratings: ratingsBundled };

// team cell colors: [background, text]
const COLORS = {
  ARI: ["#97233F", "#FFB612"], ATL: ["#A71930", "#FFFFFF"], BAL: ["#241773", "#9E7C0C"], BUF: ["#00338D", "#C60C30"],
  CAR: ["#0085CA", "#101820"], CHI: ["#0B162A", "#C83803"], CIN: ["#FB4F14", "#000000"], CLE: ["#311D00", "#FF3C00"],
  DAL: ["#003594", "#B0B7BC"], DEN: ["#FB4F14", "#002244"], DET: ["#0076B6", "#B0B7BC"], GB: ["#203731", "#FFB612"],
  HOU: ["#03202F", "#A71930"], IND: ["#002C5F", "#FFFFFF"], JAX: ["#006778", "#D7A22A"], KC: ["#E31837", "#FFB81C"],
  LAC: ["#0080C6", "#FFC20E"], LV: ["#000000", "#A5ACAF"], LAR: ["#003594", "#FFA300"], MIA: ["#008E97", "#FC4C02"],
  MIN: ["#4F2683", "#FFC62F"], NE: ["#002244", "#B0B7BC"], NO: ["#D3BC8D", "#101820"], NYG: ["#0B2265", "#FFFFFF"],
  NYJ: ["#125740", "#FFFFFF"], PHI: ["#004C54", "#A5ACAF"], PIT: ["#FFB612", "#101820"], SF: ["#AA0000", "#B3995D"],
  SEA: ["#002244", "#69BE28"], TB: ["#D50A0A", "#FFFFFF"], TEN: ["#0C2340", "#4B92DB"], WAS: ["#5A1414", "#FFB612"],
};

// ---------- math ----------
const normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x < 0 ? -y : y;
}
const winFromMargin = (m) => normCdf(m / 13.5);
// spread from this team's perspective (negative = favorite), and win prob, projected from power ratings
function projected(legId, team, ratings) {
  const g = OPP[legId][team];
  if (!g || !ratings || ratings[team] == null || ratings[g.opp] == null) return null;
  const margin = ratings[team] - ratings[g.opp] + (g.neutral ? 0 : g.home ? HFA : -HFA);
  return { spread: -margin, win: winFromMargin(margin), proj: true };
}

// ---------- True Win %: two-sided no-vig moneyline ----------
const impliedProb = (ml) => (ml > 0 ? 100 / (ml + 100) : -ml / (-ml + 100));
const validML = (ml) => Number.isFinite(ml) && Math.abs(ml) >= 100;
function devig(mlA, mlB) {
  if (!validML(mlA) || !validML(mlB)) return null;
  const qA = impliedProb(mlA), qB = impliedProb(mlB);
  return { a: qA / (qA + qB), b: qB / (qA + qB) };
}
// Turn one leg of data/odds.json ({ games: { "AWY@HOM": { ml, spread, asof } } }) into per-team lines.
// Only games with a valid two-sided moneyline get a Win %; a spread alone never does.
function linesFromOdds(legOdds) {
  const lines = {}; let asof = null, games = 0;
  for (const [key, g] of Object.entries(legOdds?.games || {})) {
    const [away, home] = key.split("@");
    const d = devig(g.ml?.[away], g.ml?.[home]); if (!d) continue;
    lines[away] = { win: d.a, ml: g.ml[away], oppMl: g.ml[home], spread: g.spread?.[away] ?? null, market: true };
    lines[home] = { win: d.b, ml: g.ml[home], oppMl: g.ml[away], spread: g.spread?.[home] ?? null, market: true };
    games++; if (!asof || (g.asof && g.asof > asof)) asof = g.asof;
  }
  return { lines, asof, games };
}
// Everything the model needs, assembled from the four data files.
function buildData({ picks, actuals, odds, ratings }) {
  const legs = {};
  for (const l of LEGS) {
    const r = linesFromOdds(odds?.legs?.[l.id]);
    if (r.games) legs[l.id] = { ...r, gamesTotal: Object.keys(OPP[l.id]).length / 2, book: odds.book };
  }
  return {
    entries: Array.isArray(picks?.entries) ? picks.entries : [],
    legs, ratings: ratings?.ratings || null, ratingsAt: ratings?.updatedAt || null, ratingsSrc: ratings?.source || "", oddsAt: odds?.updatedAt || null,
    actuals: actuals?.legs || {}, contest: actuals?.contest || { start: 0, pool: 0, share: 0 },
  };
}
// lineFor: any line for display / future-value projection. Live market line if captured, else a projection
// from power ratings (proj: true). NEVER use this for the selected leg's True Win % — use marketLine().
function lineFor(legId, team, data) {
  const live = data?.legs?.[legId]?.lines?.[team];
  if (live) return { ...live, proj: false };
  return projected(legId, team, data?.ratings);
}
function marketLine(legId, team, data) {
  const ln = data?.legs?.[legId]?.lines?.[team];
  return ln && ln.market && ln.win != null ? { ...ln, proj: false } : null;
}
function defaultLeg() {
  const now = Date.now();
  for (let i = 0; i < LEGS.length; i++) {
    const nxt = LEGS[i + 1];
    if (!nxt || new Date(nxt.start + "T12:00:00").getTime() > now) return LEGS[i].id;
  }
  return "W18";
}

// ---------- Circa field: actuals timeline ----------
// derived per-leg field math, in leg order
function fieldTimeline(data) {
  const { contest, actuals } = data;
  let live = contest.start;
  const out = [];
  for (const l of LEGS) {
    const a = actuals[l.id]; if (!a) break;
    const lost = Object.entries(a.picks).filter(([t]) => a.lost.includes(t)).reduce((s, [, n]) => s + n, 0);
    const pend = Object.entries(a.picks).filter(([t]) => a.pending.includes(t)).reduce((s, [, n]) => s + n, 0);
    const before = live; live = before - lost;
    out.push({ leg: l, before, lost, pending: pend, after: live, value: contest.pool / live });
  }
  return out;
}

// ---------- Circa field model ----------
// P(team) ∝ win^a · exp(-b · futureValue) · availability, over teams with a game that leg.
// a = how hard the field chases the biggest favorite, b = how much it saves high-future-value teams.
function fvFor(legId, team, data) {
  const idx = LEGS.findIndex((l) => l.id === legId);
  let fv = 0;
  for (const l of LEGS.slice(idx + 1)) { const ln = lineFor(l.id, team, data); if (ln) fv += Math.max(0, ln.win - 0.6); }
  return data?.ratings ? fv : 0;
}
// share of the field still holding each team going into legId, from actual picks in earlier legs
function availability(legId, data) {
  const idx = LEGS.findIndex((l) => l.id === legId);
  const tl = fieldTimeline(data);
  const burned = {};
  for (let k = 0; k < Math.min(idx, tl.length); k++) {
    const r = tl[k], a = data.actuals[r.leg.id];
    let survive = 1;
    for (let j = k + 1; j < Math.min(idx, tl.length); j++) survive *= tl[j].after / tl[j].before;
    for (const [t, n] of Object.entries(a.picks)) if (a.won.includes(t)) burned[t] = (burned[t] || 0) + n * survive;
  }
  const live = idx < tl.length ? tl[idx].before : (tl.length ? tl[tl.length - 1].after : data.contest.start);
  const out = {};
  for (const t of ALL_TEAMS) out[t] = Math.max(0, 1 - (burned[t] || 0) / (live || 1));
  return out;
}
function modelPick(legId, data, params) {
  const { a, b } = params;
  const av = availability(legId, data);
  const sc = {};
  let tot = 0;
  for (const t of Object.keys(OPP[legId])) {
    const ln = marketLine(legId, t, data); if (!ln || ln.win < 0.5) continue;
    const v = Math.pow(ln.win, a) * Math.exp(-b * fvFor(legId, t, data)) * av[t];
    sc[t] = v; tot += v;
  }
  const out = {};
  for (const t of Object.keys(sc)) out[t] = tot > 0 ? sc[t] / tot : 0;
  return out;
}
// fit a, b to every leg that has both actuals and lines (grid search, minimize L1 distance)
function fitParams(data) {
  const legs = Object.keys(data.actuals).filter((id) => OPP[id] && Object.keys(OPP[id]).some((t) => marketLine(id, t, data)));
  const DEF = { a: 10, b: 1.5, legs: 0 };
  if (!legs.length) return DEF;
  let best = null;
  for (let a = 2; a <= 24; a += 1) for (let b = 0; b <= 4; b += 0.25) {
    let err = 0;
    for (const id of legs) {
      const act = data.actuals[id], tot = Object.values(act.picks).reduce((x, y) => x + y, 0);
      const m = modelPick(id, data, { a, b });
      for (const t of Object.keys(OPP[id])) err += Math.abs((m[t] || 0) - (act.picks[t] || 0) / tot);
    }
    if (!best || err < best.err) best = { a, b, err, legs: legs.length };
  }
  return best;
}
// mean L1 error of the model vs Circa actuals on legs where both exist
function modelError(data, params) {
  let e = 0, n = 0;
  for (const id of Object.keys(data.actuals)) {
    const act = data.actuals[id], tot = Object.values(act.picks).reduce((x, y) => x + y, 0);
    const m = modelPick(id, data, params); if (!Object.keys(m).length) continue;
    e += Object.keys(OPP[id]).reduce((s, t) => s + Math.abs((m[t] || 0) - (act.picks[t] || 0) / tot), 0); n++;
  }
  return n ? { err: e / n, n } : null;
}

export { linesFromOdds, buildData, devig, fieldTimeline, modelPick, fitParams, availability };

const CSS = `
.csp { display:flex; flex-direction:column; height:100vh; background:#f3f2ee; font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color:#1a1a1a; font-variant-numeric: tabular-nums; -webkit-font-smoothing:antialiased; }
.csp * { box-sizing: border-box; }
.csp h1 { font-size:22px; font-weight:700; letter-spacing:-0.01em; margin:0; }
.csp h1 .ver { font-size:11px; font-weight:500; color:#9a978f; margin-left:8px; vertical-align:middle; }
.csp .bar { padding:14px 12px 10px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; }
.csp .tabs { display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:10px; }
.csp .tab { border:1px solid #d9d6cf; background:#fff; border-radius:999px; padding:6px 12px; font-size:13px; cursor:pointer; color:#1a1a1a; }
.csp .tab.on { background:#1a1a1a; color:#fff; border-color:#1a1a1a; }
.csp .tab .n { color:#9a978f; margin-left:6px; font-size:12px; }
.csp .tab.on .n { color:#bdbab3; }
.csp .status { font-size:12px; color:#6f6c66; }
.csp .status.err { color:#b3261e; }
.csp .ctl { display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-size:13px; }
.csp .ctl select, .csp select.sel { font-size:13px; padding:5px 8px; border:1px solid #d9d6cf; border-radius:6px; background:#fff; }
.csp .btn { font-size:13px; padding:6px 12px; border:1px solid #1a1a1a; background:#1a1a1a; color:#fff; border-radius:6px; cursor:pointer; }
.csp .btn:disabled { opacity:.5; cursor:default; }
.csp .stamp { font-size:11px; color:#6f6c66; }
.csp .who { font-size:12px; color:#1f5a22; }

.csp .wrap { flex:1; min-height:0; overflow:auto; background:#fff; }
.csp table { border-collapse:separate; border-spacing:0; font-size:12px; }
.csp th, .csp td { padding:0; border-right:1px solid #e4e2dc; border-bottom:1px solid #e4e2dc; white-space:nowrap; }
.csp th { font-weight:600; color:#e9e8e3; background:#2b2f33; position:sticky; top:0; z-index:3; height:38px; vertical-align:bottom; padding-bottom:5px; text-align:center; border-color:#3d4247; cursor:pointer; user-select:none; }
.csp th .lsub { display:block; font-weight:400; font-size:10px; color:#a9adb1; }
.csp th.sorted { background:#3d4247; box-shadow: inset 0 -3px 0 #c9edc7; }
.csp td.hol { background:#fff6e1; }
.csp th.hol { background:#5c4410; color:#ffd27a; }
.csp th.hol .lsub { color:#d9b46a; }
.csp th.hol.sorted { background:#6e5418; }

/* sticky left block: EV | W% | P% | Team */
.csp .L { position:sticky; z-index:2; background:#fff; height:30px; text-align:center; }
.csp .L.ev { left:0; width:46px; min-width:46px; }
.csp .L.wp { left:46px; width:48px; min-width:48px; }
.csp .L.pp { left:94px; width:48px; min-width:48px; }
.csp .L.team { left:142px; text-align:left; padding:0 8px 0 14px; min-width:118px; font-weight:600; border-bottom-color:rgba(0,0,0,.25); }
.csp th.L { z-index:4; background:#2b2f33; color:#e9e8e3; border-bottom-color:#3d4247; height:38px; padding-bottom:5px; vertical-align:bottom; }
.csp th.L.team { text-align:left; padding-left:14px; }
.csp td.L.num { color:#3a3833; font-size:12px; }
.csp td.L.num.blank { color:#c9c6bf; }
.csp td.L.num.top { font-weight:700; color:#1f5a22; }
.csp .team .hd { display:inline-block; width:7px; height:7px; border-radius:50%; margin-left:5px; vertical-align:middle; background:#e3a83a; box-shadow:0 0 0 1.5px #fff, 0 0 0 2.5px rgba(0,0,0,.45); }
.csp .team .hd.x { background:#c0392b; }
.csp .team .used { font-weight:400; opacity:.75; font-size:10px; margin-left:6px; }
.csp tr.gone .team .nm { text-decoration:line-through; opacity:.5; }

.csp td.c { width:56px; min-width:56px; height:30px; text-align:center; position:relative; cursor:pointer; user-select:none; color:#1a1a1a; line-height:1; padding-top:1px; }
.csp.ro td.c { cursor:default; }
.csp td.c .sp { display:block; font-size:9px; color:#6f6c66; margin-top:2px; }
.csp td.c .sp.proj { color:#9a978f; font-style:italic; }
.csp td.c .fb { position:absolute; left:0; top:0; bottom:0; width:4px; }
.csp td.c.away { color:#4d4a44; }
.csp td.c.bye { background:#e9e8e3; cursor:default; }
.csp td.c.bye.hol { background:#efe6cf; }
.csp td.c.dead { color:#c4c1ba; text-decoration:line-through; cursor:not-allowed; }
.csp td.c.dead .sp, .csp td.c.dim .sp { color:#c4c1ba; }
.csp td.c.dim { color:#b5b2ab; }
.csp td.c.pick { background:#c9edc7; color:#1f5a22; font-weight:700; text-decoration:none; }
.csp td.c.pick .sp { color:#2e7a33; }
.csp:not(.ro) td.c:not(.bye):not(.dead):hover { box-shadow: inset 0 0 0 2px #1a1a1a; }
.csp td.c .oth { position:absolute; top:1px; right:3px; font-size:9px; color:#8a5a00; letter-spacing:1px; }
.csp td.c.pick .oth { color:#6b8a2b; }

.csp td.fv { width:70px; min-width:70px; height:30px; padding:0 6px; }
.csp td.fv .fvbar { height:8px; background:#e9e8e3; border-radius:2px; overflow:hidden; }
.csp td.fv .fvbar i { display:block; height:100%; background:#2e7a33; }
.csp th.fv { width:70px; min-width:70px; }

.csp .sum td { position:sticky; top:var(--top); z-index:2; background:#fff; height:30px; text-align:center; font-weight:600; font-size:12px; cursor:pointer; }
.csp .sum td.L { z-index:5; }
.csp .sum td.team { cursor:pointer; color:#6f6c66; font-weight:500; }
.csp .sum td.team.on { color:#1a1a1a; font-weight:700; }
.csp .sum td.s { width:56px; min-width:56px; }
.csp .sum td.empty { color:#d9d6cf; font-weight:400; }
.csp .sum td.dupe { box-shadow: inset 0 0 0 2px #ff2d2d; }
.csp .sum td.hol { background:#fff6e1; }
.csp .sum tr.gap td { height:10px; background:#f3f2ee; cursor:default; position:sticky; top:128px; z-index:4; border-color:#f3f2ee; }
.csp .sum tr.hdr2 th { top:136px; }
.csp .sum tr.hdr2 th.L { z-index:5; }

.csp .views { display:flex; gap:4px; margin-left:18px; vertical-align:middle; }
.csp .views button { font-size:13px; padding:5px 12px; border:1px solid #d9d6cf; background:#fff; border-radius:6px; cursor:pointer; color:#6f6c66; }
.csp .views button.on { background:#2b2f33; color:#fff; border-color:#2b2f33; }
.csp .act { flex:1; min-height:0; overflow:auto; padding:0 12px 20px; }
.csp .cards { display:flex; gap:10px; flex-wrap:wrap; margin:6px 0 14px; }
.csp .card { background:#fff; border:1px solid #e4e2dc; border-radius:8px; padding:10px 14px; min-width:150px; }
.csp .card .k { font-size:11px; color:#6f6c66; text-transform:uppercase; letter-spacing:.04em; }
.csp .card .v { font-size:22px; font-weight:700; margin-top:2px; }
.csp .card .d { font-size:11px; color:#6f6c66; margin-top:2px; }
.csp .card .v.up { color:#1f5a22; }
.csp .legcard { background:#fff; border:1px solid #e4e2dc; border-radius:8px; margin-bottom:14px; overflow:hidden; }
.csp .legcard .hd2 { display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap; padding:10px 14px; background:#2b2f33; color:#e9e8e3; }
.csp .legcard .hd2 .legsel { font-size:15px; font-weight:700; color:#fff; background:#3d4247; border:1px solid #555a60; border-radius:6px; padding:4px 8px; }
.csp .legcard .hd2 .m { font-size:12px; color:#a9adb1; }
.csp .legcard .hd2 .m b { color:#fff; }
.csp .dist { width:100%; border-collapse:collapse; font-size:12px; }
.csp .dist th { position:static; height:auto; background:#f3f2ee; color:#3a3833; font-size:11px; padding:6px 10px; text-align:right; border:none; border-bottom:1px solid #e4e2dc; cursor:default; }
.csp .dist th:first-child, .csp .dist td:first-child { text-align:left; }
.csp .dist td { padding:0 10px; height:26px; text-align:right; border:none; border-bottom:1px solid #f0efeb; }
.csp .dist tr.L td { background:#fdf1f0; }
.csp .dist tr.P td { background:#fffaf0; }
.csp .dist .chip { display:inline-block; min-width:44px; text-align:center; padding:3px 6px; border-radius:4px; font-weight:700; font-size:11px; }
.csp .dist .bar { display:inline-block; height:8px; border-radius:2px; vertical-align:middle; background:#9ac89a; }
.csp .dist tr.L .bar { background:#e08a84; }
.csp .dist tr.P .bar { background:#e3c27a; }
.csp .dist .res { font-weight:700; }
.csp .dist tr.W .res { color:#1f5a22; }
.csp .dist tr.L .res { color:#b3261e; }
.csp .dist tr.P .res { color:#8a5a00; }
.csp .dist .elim { color:#b3261e; }
.csp .chart { background:#fff; border:1px solid #e4e2dc; border-radius:8px; padding:10px 14px; margin-bottom:14px; }
.csp .chart h3 { font-size:12px; color:#6f6c66; margin:0 0 6px; font-weight:600; text-transform:uppercase; letter-spacing:.04em; }
.csp .ghost { font-size:12px; color:#6f6c66; background:none; border:1px solid #d9d6cf; border-radius:6px; padding:5px 10px; cursor:pointer; }
.csp .ghost.on { background:#fff; color:#1a1a1a; border-color:#1a1a1a; }
.csp .ghost:disabled { opacity:.5; cursor:default; }
.csp .audit { background:#fff; border-top:1px solid #e4e2dc; border-bottom:1px solid #e4e2dc; padding:10px 12px; max-height:46vh; overflow:auto; }
.csp .audit .f { font-size:12px; color:#3a3833; margin-bottom:8px; line-height:1.5; }
.csp .audit .f code { background:#f3f2ee; padding:1px 5px; border-radius:3px; }
.csp .audit table { border-collapse:collapse; font-size:12px; }
.csp .audit th { position:static; height:auto; padding:4px 10px; background:#f3f2ee; color:#3a3833; font-size:11px; text-align:right; border:none; border-bottom:1px solid #e4e2dc; cursor:default; }
.csp .audit td { padding:0 10px; height:24px; text-align:right; border:none; border-bottom:1px solid #f0efeb; color:#3a3833; }
.csp .audit th:first-child, .csp .audit td:first-child { text-align:left; font-weight:700; color:#1a1a1a; }
.csp .audit td.fin { font-weight:700; color:#1a1a1a; }
.csp .audit td.mut { color:#9a978f; }
.csp .panel { background:#fff; border-top:1px solid #e4e2dc; border-bottom:1px solid #e4e2dc; padding:10px 12px; }
.csp .panel .f { font-size:12px; color:#3a3833; margin-bottom:6px; line-height:1.5; }
.csp .panel .f code { background:#f3f2ee; padding:1px 5px; border-radius:3px; }
.csp .panel input[type=text], .csp .panel input[type=password], .csp .panel input[type=number] { font-size:13px; padding:5px 8px; border:1px solid #d9d6cf; border-radius:6px; background:#fff; }
.csp .panel .row { display:flex; gap:8px; margin-top:6px; align-items:center; flex-wrap:wrap; }
.csp .editor { background:#fff; border:1px solid #e4e2dc; border-radius:8px; margin-bottom:14px; padding:10px 14px; }
.csp .editor h3 { font-size:13px; margin:0 0 8px; }
.csp .editor .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:8px; font-size:12px; }
.csp .editor label { display:flex; gap:6px; align-items:center; color:#3a3833; }
.csp .editor input, .csp .editor select { font-size:12px; padding:4px 6px; border:1px solid #d9d6cf; border-radius:5px; background:#fff; }
.csp .editor input.num { width:80px; text-align:right; }
.csp .editor .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap:6px 14px; margin:8px 0; }
.csp .editor .grid .g { display:flex; gap:6px; align-items:center; font-size:12px; }
.csp .editor .grid .g .chip { display:inline-block; min-width:44px; text-align:center; padding:3px 6px; border-radius:4px; font-weight:700; font-size:11px; }
.csp .legend { background:#f3f2ee; display:flex; gap:16px; flex-wrap:wrap; padding:10px 12px; font-size:12px; color:#6f6c66; }
.csp .legend span b { display:inline-block; width:10px; height:10px; margin-right:5px; vertical-align:-1px; border-radius:2px; }
`;

const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null);

export default function CircaSurvivorPlanner() {
  const [files, setFiles] = useState(() => Object.fromEntries(Object.keys(PATHS).map((k) => [k, { json: BUNDLED[k], sha: null }])));
  const filesRef = useRef(files); filesRef.current = files;
  const [token, setToken] = useState(() => { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } });
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [statusErr, setStatusErr] = useState(false);
  const [active, setActive] = useState(0);
  const [legId, setLegId] = useState(defaultLeg());
  const [sort, setSort] = useState({ key: "ev", dir: 1 }); // key: ev|wp|pp|team|fv|<legId>
  const [view, setView] = useState("planner");
  const [audit, setAudit] = useState(false);
  const [signin, setSignin] = useState(false);
  const [tokenDraft, setTokenDraft] = useState("");
  const [updating, setUpdating] = useState(false);
  const say = (msg, err = false) => { setStatus(msg); setStatusErr(err); };

  // read the live data files from the repo (falls back to the copies bundled at deploy time)
  const loadAll = async (tok) => {
    const next = {}; let failed = 0;
    await Promise.all(Object.entries(PATHS).map(async ([k, p]) => {
      try { next[k] = await readFile(p, tok); } catch (e) { failed++; }
    }));
    setFiles((prev) => ({ ...prev, ...next }));
    if (failed) say(failed === Object.keys(PATHS).length ? "Showing data from the last deploy (GitHub API unavailable)" : "Some files could not be re-read from GitHub", false);
    return failed;
  };
  useEffect(() => { (async () => { await loadAll(token); setLoaded(true); })(); }, []); // eslint-disable-line
  useEffect(() => {
    if (!token) { setUser(null); return; }
    let live = true;
    whoAmI(token).then((login) => { if (live) { setUser(login); say(`Signed in as ${login}`); } })
      .catch((e) => { if (live) { setUser(null); say("GitHub token rejected: " + e.message, true); } });
    return () => { live = false; };
  }, [token]);

  const data = useMemo(() => buildData({ picks: files.picks.json, actuals: files.actuals.json, odds: files.odds.json, ratings: files.ratings.json }), [files]);
  const entries = data.entries;
  const canEdit = !!user;

  // ---- saving to the repo ----
  const saveTimer = useRef(null);
  const save = async (kind, message) => {
    const f = filesRef.current[kind];
    say("Saving to GitHub…");
    try {
      const sha = await writeFile(PATHS[kind], f.json, f.sha, token, message);
      setFiles((prev) => ({ ...prev, [kind]: { ...prev[kind], sha } }));
      say(`Saved ${fmtTime(new Date().toISOString())} · friends see it after the site rebuilds (~1 min)`);
    } catch (e) { say("Save failed: " + e.message, true); }
  };
  const setJson = (kind, fn) => setFiles((prev) => ({ ...prev, [kind]: { ...prev[kind], json: fn(prev[kind].json) } }));
  const setPick = (lg, team) => {
    if (!canEdit) { say("Sign in to change picks", false); return; }
    setJson("picks", (p) => ({ ...p, entries: p.entries.map((e, i) => { if (i !== active) return e; const picks = { ...e.picks }; if (picks[lg] === team) delete picks[lg]; else picks[lg] = team; return { ...e, picks }; }) }));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save("picks", `Picks: ${entries[active]?.name} ${lg} ${team}`), 800);
  };
  const saveActuals = (json, message) => { setJson("actuals", () => json); setTimeout(() => save("actuals", message), 0); };

  const signIn = () => { const t = tokenDraft.trim(); if (!t) return; try { localStorage.setItem(TOKEN_KEY, t); } catch {} setToken(t); setTokenDraft(""); setSignin(false); };
  const signOut = () => { try { localStorage.removeItem(TOKEN_KEY); } catch {} setToken(""); setUser(null); say("Signed out"); };
  const updateLines = async () => {
    setUpdating(true);
    try {
      await dispatchWorkflow(token, "update-data.yml");
      say("Line update started on GitHub — reloading data in 90 s…");
      setTimeout(async () => { await loadAll(token); say("Data reloaded"); setUpdating(false); }, 90000);
    } catch (e) { say("Could not start update: " + e.message + (e.status === 403 || e.status === 404 ? " (token needs Actions: read & write)" : ""), true); setUpdating(false); }
  };

  const entry = entries[active] || { name: "", picks: {} };
  const usedBy = useMemo(() => { const m = {}; for (const [leg, team] of Object.entries(entry.picks)) m[team] = leg; return m; }, [entry]);

  const params = useMemo(() => fitParams(data), [data]);
  const merr = useMemo(() => modelError(data, params), [data, params]);
  // per-team stats for selected leg
  const stats = useMemo(() => {
    const act = data.actuals[legId];
    const actTot = act ? Object.values(act.picks).reduce((a, b) => a + b, 0) : 0;
    const modelP = modelPick(legId, data, params);
    const hasModel = Object.keys(modelP).length > 0;
    const pick = act ? Object.fromEntries(Object.entries(act.picks).map(([t, n]) => [t, n / actTot])) : modelP;
    const rows = {};
    for (const t of ALL_TEAMS) {
      const mk = marketLine(legId, t, data);          // True Win % (market only) — null if no valid two-sided ML
      const disp = lineFor(legId, t, data);           // spread for display; may be a projection
      rows[t] = { win: mk ? mk.win : null, ml: mk ? mk.ml : null, oppMl: mk ? mk.oppMl : null,
        pick: (act || hasModel) ? (pick[t] ?? (disp ? 0 : null)) : null, spread: disp ? disp.spread : null, proj: disp ? disp.proj : false, pm: modelP[t], act: !!act };
    }
    // EV_i = w_i / (p_i + sum over other games of p_j w_j)
    const teams = Object.keys(OPP[legId]);
    const S = teams.reduce((a, t) => a + (rows[t].pick || 0) * (rows[t].win || 0), 0);
    let wsum = 0, psum = 0;
    for (const t of teams) {
      const r = rows[t]; if (r.win == null) continue;
      const opp = OPP[legId][t].opp;
      const own = (r.pick || 0) * r.win, oppc = (rows[opp].pick || 0) * (rows[opp].win || 0);
      const Si = (r.pick || 0) + (S - own - oppc);
      r.raw = Si > 0 ? r.win / Si : null;
      if (r.raw != null && r.pick) { wsum += r.pick * r.raw; psum += r.pick; }
    }
    // normalize so the field's pick-weighted average EV = 1.00 (the scale Atlas / SurvivorGrid use)
    const mean = psum > 0 ? wsum / psum : 1;
    for (const t of teams) { const r = rows[t]; r.ev = r.raw == null ? null : r.raw / mean; }
    for (const t of ALL_TEAMS) rows[t].fv = data.ratings ? fvFor(legId, t, data) : null;
    return rows;
  }, [data, legId, params]);
  const maxFv = Math.max(0.01, ...ALL_TEAMS.map((t) => stats[t].fv || 0));
  const topEv = Math.max(...ALL_TEAMS.map((t) => stats[t].ev || 0));

  const sortedTeams = useMemo(() => {
    const k = sort.key, d = sort.dir;
    const val = (t) => {
      if (k === "team") return t;
      if (k === "ev" || k === "wp" || k === "pp" || k === "fv") { const v = { ev: stats[t].ev, wp: stats[t].win, pp: stats[t].pick, fv: stats[t].fv }[k]; return v == null ? -Infinity : v; }
      const ln = lineFor(k, t, data); return ln && ln.spread != null ? -ln.spread : -Infinity; // favorites first
    };
    return [...ALL_TEAMS].sort((a, b) => { const va = val(a), vb = val(b); if (va === vb) return a < b ? -1 : 1; return (va < vb ? 1 : -1) * d; });
  }, [sort, stats, data]);

  const clickSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === "team" ? -1 : 1 }));
  const fmtSp = (v) => (v == null ? "" : v > 0 ? "+" + v : v === 0 ? "PK" : String(v));
  const pct = (v) => (v == null ? "–" : Math.round(v * 100) + "%");
  const cur = LEGS.find((l) => l.id === legId);
  const legInfo = data.legs[legId];
  const stamp = legInfo ? `${legInfo.book === "draftkings" ? "DraftKings" : legInfo.book} · ${fmtTime(legInfo.asof)} · ${legInfo.games}/${legInfo.gamesTotal} games` : "no lines yet for this leg";

  const Header = () => (
    <>
      <th className={"L ev" + (sort.key === "ev" ? " sorted" : "")} onClick={() => clickSort("ev")} title={`EV for ${legLabel(cur)}`}>EV</th>
      <th className={"L wp" + (sort.key === "wp" ? " sorted" : "")} onClick={() => clickSort("wp")} title={`True Win % — two-sided no-vig moneyline · ${stamp}`}>W%</th>
      <th className={"L pp" + (sort.key === "pp" ? " sorted" : "")} onClick={() => clickSort("pp")} title="Circa pick popularity (actual once posted, field model before)">P%</th>
      <th className={"L team" + (sort.key === "team" ? " sorted" : "")} onClick={() => clickSort("team")}>Team</th>
      {LEGS.map((l) => (
        <th key={l.id} className={(l.holiday ? "hol" : "") + (sort.key === l.id ? " sorted" : "") + (l.id === legId ? " cur" : "")} title={`${legLabel(l)} — click to sort by spread`} onClick={() => clickSort(l.id)}>
          {l.label}{l.sub && <span className="lsub">{l.sub}</span>}
        </th>
      ))}
      <th className={"fv" + (sort.key === "fv" ? " sorted" : "")} onClick={() => clickSort("fv")} title="Future value: strong-favorite spots left after this leg">Future</th>
    </>
  );

  return (
    <div className={"csp" + (canEdit ? "" : " ro")}>
      <style>{CSS}</style>
      <div className="bar">
        <div>
          <h1 style={{ display: "flex", alignItems: "center" }}>Circa Survivor 2026 <span className="ver">v{VERSION}</span>
            <span className="views">
              <button className={view === "planner" ? "on" : ""} onClick={() => setView("planner")}>Planner</button>
              <button className={view === "actuals" ? "on" : ""} onClick={() => setView("actuals")}>Actuals</button>
            </span>
          </h1>
          {view === "planner" && <div className="tabs">
            {entries.map((e, i) => (
              <button key={i} className={"tab" + (i === active ? " on" : "")} onClick={() => setActive(i)}>
                {e.name}<span className="n">{Object.keys(e.picks).length}/20</span>
              </button>
            ))}
            <span className={"status" + (statusErr ? " err" : "")}>{loaded ? status : "Loading…"}</span>
          </div>}
        </div>
        <div className="ctl">
          {view === "planner" && <>
            <select value={legId} onChange={(e) => setLegId(e.target.value)}>
              {LEGS.map((l) => <option key={l.id} value={l.id}>{legLabel(l)}</option>)}
            </select>
            <span className="stamp" title={`Lines update automatically twice a day. Ratings: ${data.ratingsSrc}`}>Lines: {stamp}</span>
            <button className={"ghost" + (audit ? " on" : "")} onClick={() => setAudit((a) => !a)} title="Show how P% was built">
              {data.actuals[legId] ? "P% = Circa actuals" : "P% = field model"} {audit ? "▴" : "▾"}
            </button>
          </>}
          {canEdit && view === "planner" && <button className="ghost" onClick={updateLines} disabled={updating} title="Run the GitHub job that pulls fresh moneylines now">{updating ? "Updating…" : "Update lines now"}</button>}
          {canEdit ? <><span className="who">✓ {user}</span><button className="ghost" onClick={signOut}>Sign out</button></>
            : <button className={"ghost" + (signin ? " on" : "")} onClick={() => setSignin((s) => !s)}>Sign in to edit</button>}
        </div>
      </div>

      {signin && !canEdit && (
        <div className="panel">
          <div className="f">
            Viewers can look; only the owner edits. Paste a GitHub <b>fine-grained personal access token</b> for <code>{REPO}</code> with
            <code>Contents: read & write</code> (and <code>Actions: read & write</code> for the "Update lines now" button). It is kept only in this browser.
          </div>
          <div className="row">
            <input type="password" placeholder="github_pat_…" value={tokenDraft} onChange={(e) => setTokenDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && signIn()} style={{ width: 320 }} />
            <button className="btn" onClick={signIn}>Sign in</button>
            <button className="ghost" onClick={() => setSignin(false)}>Cancel</button>
          </div>
        </div>
      )}
      {view === "actuals" && <Actuals data={data} params={params} canEdit={canEdit} onSave={saveActuals} />}
      {view === "planner" && audit && <AuditPanel legId={legId} data={data} params={params} merr={merr} stats={stats} />}
      {view === "planner" && <>

      <div className="wrap">
        <table>
          <thead><tr><Header /></tr></thead>
          <tbody className="sum">
            {entries.map((e, i) => (
              <tr key={"s" + i} style={{ "--top": 38 + i * 30 + "px" }}>
                <td className="L ev" onClick={() => setActive(i)}></td>
                <td className="L wp" onClick={() => setActive(i)}></td>
                <td className="L pp" onClick={() => setActive(i)}></td>
                <td className={"L team" + (i === active ? " on" : "")} onClick={() => setActive(i)}>{e.name}</td>
                {LEGS.map((l) => {
                  const t = e.picks[l.id];
                  const dupe = t && entries.some((o, j) => j !== i && o.picks[l.id] === t);
                  return (
                    <td key={l.id} className={"s" + (t ? "" : " empty") + (dupe ? " dupe" : "") + (l.holiday ? " hol" : "")}
                        title={dupe ? "Another entry has the same pick this leg" : ""}
                        style={t ? { background: COLORS[t][0], color: COLORS[t][1] } : undefined}
                        onClick={() => setActive(i)}>{t || "·"}</td>
                  );
                })}
                <td onClick={() => setActive(i)}></td>
              </tr>
            ))}
            <tr className="gap"><td colSpan={LEGS.length + 5}></td></tr>
            <tr className="hdr2"><Header /></tr>
          </tbody>
          <tbody>
            {sortedTeams.map((team) => {
              const usedLeg = usedBy[team];
              const st = stats[team];
              const inLeg = !!OPP[legId][team];
              return (
                <tr key={team} className={usedLeg ? "gone" : ""}>
                  <td className={"L ev num" + (st.ev == null ? " blank" : st.ev === topEv ? " top" : "")}>{st.ev == null ? (inLeg ? "–" : "") : st.ev.toFixed(2)}</td>
                  <td className={"L wp num" + (st.win == null ? " blank" : "")} title={inLeg ? (st.win == null ? "No two-sided moneyline posted yet for this game" : `ML ${fmtSp(st.ml)} vs ${fmtSp(st.oppMl)} → ${pct(st.win)} no-vig`) : ""}>{inLeg ? pct(st.win) : ""}</td>
                  <td className={"L pp num" + (st.pick == null ? " blank" : "")} title={inLeg ? (st.act ? "Circa actual" : `field model ${pct(st.pm)}`) : ""}>{inLeg ? (st.pick == null ? "–" : st.pick < 0.005 ? "<1%" : Math.round(st.pick * 100) + "%") : ""}</td>
                  <td className="L team" style={{ background: COLORS[team][0], color: COLORS[team][1] }}>
                    <span className="nm">{team}</span>
                    {TG_TEAMS.has(team) && <span className="hd" title="Plays in Thanksgiving leg" />}
                    {XM_TEAMS.has(team) && <span className="hd x" title="Plays in Christmas leg" />}
                    {usedLeg && <span className="used">{LEGS.find((l) => l.id === usedLeg).label}</span>}
                  </td>
                  {LEGS.map((l) => {
                    const g = OPP[l.id][team];
                    const ln = g ? lineFor(l.id, team, data) : null;
                    const pickHere = entry.picks[l.id] === team;
                    const legTaken = !!entry.picks[l.id] && !pickHere;
                    const dead = usedLeg && usedLeg !== l.id;
                    const others = entries.map((e, i) => (i !== active && e.picks[l.id] === team ? i + 1 : null)).filter(Boolean).join("");
                    let cls = "c";
                    if (l.holiday) cls += " hol";
                    if (!g) cls += " bye"; else if (pickHere) cls += " pick"; else if (dead) cls += " dead"; else if (legTaken) cls += " dim"; else if (!g.home) cls += " away";
                    const label = !g ? "" : (g.neutral ? "n " : g.home ? "vs " : "@ ") + g.opp;
                    const fav = ln && ln.spread != null && ln.spread < 0 && !dead ? Math.min(1, -ln.spread / 14) : 0;
                    const tip = !g ? `${team} bye` : dead ? `${team} already used (${legLabel(LEGS.find((x) => x.id === usedLeg))})`
                      : `${legLabel(l)}: ${team} ${g.home || g.neutral ? "vs" : "at"} ${g.opp}${g.neutral ? " (neutral)" : ""}${ln ? ` · ${fmtSp(ln.spread)}${ln.market ? ` · ML ${fmtSp(ln.ml)} / ${fmtSp(ln.oppMl)} · True Win ${pct(ln.win)}` : ln.proj ? ` · projected ${pct(ln.win)} (ratings, not market)` : ""}` : ""}${canEdit ? "" : " · sign in to change picks"}`;
                    return (
                      <td key={l.id} className={cls} title={tip} onClick={() => g && !dead && setPick(l.id, team)}>
                        {fav > 0 && <span className="fb" style={{ background: `rgba(46,122,51,${0.15 + 0.85 * fav})` }} />}
                        {label}
                        {ln && <span className={"sp" + (ln.proj ? " proj" : "")}>{ln.spread != null ? fmtSp(ln.spread) : ln.market ? "ML " + fmtSp(ln.ml) : ""}</span>}
                        {others && <span className="oth">{others}</span>}
                      </td>
                    );
                  })}
                  <td className="fv" title={st.fv == null ? "No power ratings yet" : `${st.fv.toFixed(2)} — sum of win prob above 60% in remaining legs`}>
                    {st.fv != null && <div className="fvbar"><i style={{ width: (100 * st.fv / maxFv) + "%" }} /></div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="legend">
        <span><b style={{ background: "#c9edc7" }} />this entry's pick</span>
        <span><s style={{ color: "#c4c1ba" }}>@ KC</s>&nbsp; team already burned</span>
        <span><b style={{ background: "#fff6e1", border: "1px solid #e3d5ae" }} />holiday leg</span>
        <span><b style={{ background: "#2e7a33", width: 4 }} />favorite strength (market line; <i>projected from ratings</i> in italics — projections never feed W%)</span>
        <span><b style={{ background: "#e3a83a", borderRadius: "50%" }} />plays Thanksgiving&nbsp; <b style={{ background: "#c0392b", borderRadius: "50%" }} />plays Christmas</span>
        <span style={{ color: "#8a5a00" }}>¹²³ = another entry has this pick</span>
      </div>
      </>}
    </div>
  );
}

// ---------- P% audit panel ----------
function AuditPanel({ legId, data, params, merr, stats }) {
  const act = data.actuals[legId];
  const leg = data.legs[legId] || {};
  const av = availability(legId, data);
  const mlTxt = (v) => (v == null ? "" : v > 0 ? "+" + v : String(v));
  const teams = Object.keys(OPP[legId]).filter((t) => stats[t].win != null).sort((a, b) => (stats[b].pick || 0) - (stats[a].pick || 0));
  // raw model score so the reader can follow the arithmetic
  const raw = {}; let tot = 0;
  for (const t of teams) { const w = stats[t].win; if (w < 0.5) { raw[t] = 0; continue; } raw[t] = Math.pow(w, params.a) * Math.exp(-params.b * (stats[t].fv || 0)) * av[t]; tot += raw[t]; }
  const pc = (v, d = 0) => (v == null ? "–" : (100 * v).toFixed(d) + "%");
  return (
    <div className="audit">
      <div className="f">
        {act ? <>This leg is locked — P% is Circa's posted distribution, so nothing is estimated.</> : <>
          <b>Field model</b>: <code>win^{params.a} × e^(−{params.b} × future value) × availability</code>, normalized across teams favored this leg. Teams under 50% get 0. Fit on {params.legs} leg(s) of Circa actuals{merr ? <> — average miss so far {pc(merr.err)} per team</> : null}.
        </>}
        <br /><b>True Win %</b>: {leg.games ? <>two-sided no-vig moneylines from <code>{leg.book}</code> as of {fmtTime(leg.asof)} — {leg.games}/{leg.gamesTotal} games</> : "no moneylines captured for this leg yet (the book posts them about a week out)"}. Spreads and future weeks are display/projection only and never feed Win %.
        <br /><b>Power ratings</b>: {data.ratingsSrc || "none"}{data.ratingsAt ? <>, updated {fmtTime(data.ratingsAt)}</> : null}.
      </div>
      <table>
        <thead><tr><th>Team</th><th>ML</th><th>Win</th><th>Future value</th><th>Field holding</th><th>Model raw</th><th>Model %</th><th>Final</th></tr></thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t}>
              <td>{t}</td>
              <td className="mut">{stats[t].ml != null ? `${mlTxt(stats[t].ml)} / ${mlTxt(stats[t].oppMl)}` : "–"}</td>
              <td>{pc(stats[t].win)}</td>
              <td>{stats[t].fv == null ? "–" : stats[t].fv.toFixed(2)}</td>
              <td title="share of the live field that has not used this team yet">{pc(av[t])}</td>
              <td className="mut">{raw[t] ? raw[t].toExponential(2) : "0"}</td>
              <td>{pc(tot ? raw[t] / tot : 0, 1)}</td>
              <td className="fin">{pc(stats[t].pick, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Actuals tab ----------
function Actuals({ data, params, canEdit, onSave }) {
  const { entries, contest, actuals } = data;
  const tl = fieldTimeline(data);
  const last = tl[tl.length - 1];
  const [selLeg, setSelLeg] = useState(last ? last.leg.id : null);
  const [editing, setEditing] = useState(null); // leg id being edited, or "contest"
  useEffect(() => { if (selLeg == null && last) setSelLeg(last.leg.id); }, [last, selLeg]);
  // Jamie's entries: alive unless a completed leg's pick lost (or no pick was made for a completed leg)
  const alive = entries.map((e) => tl.every((r) => { const t = e.picks[r.leg.id]; return t && !actuals[r.leg.id].lost.includes(t); }));
  const nAlive = alive.filter(Boolean).length;
  const value0 = contest.start ? contest.pool / contest.start : 0;
  const equityNow = last ? nAlive * contest.share * last.value : entries.length * contest.share * value0;
  const equity0 = entries.length * contest.share * value0;
  const money = (v) => "$" + Math.round(v).toLocaleString();
  const num = (v) => v.toLocaleString();
  const pctOf = (n, d) => (d ? (100 * n / d).toFixed(n / d < 0.01 ? 2 : 1) + "%" : "–");
  const name = (t) => (t === "NOPICK" ? "No pick" : t);
  const nextLeg = LEGS.find((l) => !actuals[l.id]);

  // series for chart: live entries per leg + equity
  const pts = [{ x: "Start", live: contest.start, eq: equity0 }, ...tl.map((r, i) => ({ x: r.leg.label, live: r.after, eq: entries.reduce((s, e) => s + (tl.slice(0, i + 1).every((q) => e.picks[q.leg.id] && !actuals[q.leg.id].lost.includes(e.picks[q.leg.id])) ? 1 : 0), 0) * contest.share * r.value }))];

  return (
    <div className="act">
      <div className="cards">
        <div className="card"><div className="k">Starting entries</div><div className="v">{num(contest.start)}</div><div className="d">{money(contest.pool)} pool</div></div>
        <div className="card"><div className="k">Live entries</div><div className="v">{num(last ? last.after : contest.start)}</div><div className="d">{last ? `${pctOf(contest.start - last.after, contest.start)} eliminated${last.pending ? ` · ${num(last.pending)} pending` : ""}` : ""}</div></div>
        <div className="card"><div className="k">Implied value / entry</div><div className="v">{money(last ? last.value : value0)}</div><div className="d">pool ÷ live entries</div></div>
        <div className="card"><div className="k">Your equity</div><div className={"v" + (equityNow > equity0 ? " up" : "")}>{money(equityNow)}</div><div className="d">{nAlive}/{entries.length} entries alive · {Math.round(contest.share * 100)}% each · started {money(equity0)}</div></div>
        {canEdit && <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
          {nextLeg && <button className="ghost" onClick={() => setEditing(nextLeg.id)}>+ Enter {legLabel(nextLeg)} results</button>}
          {selLeg && <button className="ghost" onClick={() => setEditing(selLeg)}>Edit {legLabel(LEGS.find((l) => l.id === selLeg))}</button>}
          <button className="ghost" onClick={() => setEditing("contest")}>Edit contest size</button>
        </div>}
      </div>

      {editing === "contest" && <ContestEditor contest={contest} onCancel={() => setEditing(null)}
        onSave={(c) => { onSave({ contest: c, legs: actuals }, "Actuals: contest size"); setEditing(null); }} />}
      {editing && editing !== "contest" && <LegEditor legId={editing} current={actuals[editing]} onCancel={() => setEditing(null)}
        onSave={(legData) => { onSave({ contest, legs: { ...actuals, [editing]: legData } }, `Actuals: ${legLabel(LEGS.find((l) => l.id === editing))}`); setSelLeg(editing); setEditing(null); }} />}

      {pts.length > 1 && <Chart pts={pts} money={money} num={num} start={contest.start} />}

      {tl.filter((r) => r.leg.id === selLeg).map((r) => {
        const a = actuals[r.leg.id];
        const tot = Object.values(a.picks).reduce((x, y) => x + y, 0);
        const rows = Object.entries(a.picks).sort((x, y) => y[1] - x[1]);
        const max = rows.length ? rows[0][1] : 1;
        const st = (t) => (a.lost.includes(t) ? "L" : a.pending.includes(t) ? "P" : a.won.includes(t) ? "W" : "");
        const mp = modelPick(r.leg.id, data, params);
        const hasM = Object.keys(mp).length > 0;
        const fp = (v) => (v == null ? "" : v < 0.005 ? "<1%" : (100 * v).toFixed(v < 0.1 ? 1 : 0) + "%");
        return (
          <div className="legcard" key={r.leg.id}>
            <div className="hd2">
              <select className="legsel" value={selLeg} onChange={(e) => setSelLeg(e.target.value)}>
                {tl.map((q) => <option key={q.leg.id} value={q.leg.id}>{legLabel(q.leg)}</option>)}
              </select>
              <span className="m"><b>{num(r.before)}</b> in → <b>{num(r.lost)}</b> out ({pctOf(r.lost, r.before)}){r.pending ? <> → <b>{num(r.pending)}</b> pending</> : null} → <b>{num(r.after)}</b> live · {a.asOf}</span>
            </div>
            <table className="dist">
              <thead><tr><th>Team</th><th>Entries</th><th>% of field</th><th style={{ textAlign: "left" }}></th>{hasM && <th title={`win^${params.a} · e^(−${params.b}·FV) · availability`}>Model est.</th>}<th>Result</th><th>Eliminated</th></tr></thead>
              <tbody>
                {rows.map(([t, n]) => {
                  const k = st(t);
                  const col = COLORS[t] || ["#c9c6bf", "#1a1a1a"];
                  return (
                    <tr key={t} className={k}>
                      <td><span className="chip" style={{ background: col[0], color: col[1] }}>{name(t)}</span></td>
                      <td>{num(n)}</td>
                      <td>{pctOf(n, tot)}</td>
                      <td style={{ textAlign: "left", width: "26%" }}><span className="bar" style={{ width: (100 * n / max) + "%" }} /></td>
                      {hasM && <td style={{ color: "#6f6c66" }}>{fp(mp[t])}</td>}
                      <td className="res">{k === "W" ? "Won" : k === "L" ? "Lost" : k === "P" ? "Pending" : ""}</td>
                      <td className="elim">{k === "L" ? "−" + num(n) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      {!tl.length && <div className="editor"><h3>No Circa results entered yet.</h3><div className="row">{canEdit ? "Use “Enter Week 1 results” above after Circa posts its selections." : "Check back after the first week locks."}</div></div>}
    </div>
  );
}

// Enter/edit one leg of Circa's posted selections: entries per team and each team's result.
function LegEditor({ legId, current, onSave, onCancel }) {
  const leg = LEGS.find((l) => l.id === legId);
  const teams = [...Object.keys(OPP[legId]).sort(), "NOPICK"];
  const init = () => {
    const rows = {};
    for (const t of teams) rows[t] = { n: current?.picks?.[t] ?? "", r: current?.lost?.includes(t) ? "lost" : current?.pending?.includes(t) ? "pending" : current?.won?.includes(t) ? "won" : "" };
    return rows;
  };
  const [rows, setRows] = useState(init);
  const [asOf, setAsOf] = useState(current?.asOf || "");
  const set = (t, k, v) => setRows((p) => ({ ...p, [t]: { ...p[t], [k]: v } }));
  const total = teams.reduce((s, t) => s + (parseInt(rows[t].n, 10) || 0), 0);
  const submit = () => {
    const picks = {}, won = [], lost = [], pending = [];
    for (const t of teams) {
      const n = parseInt(rows[t].n, 10);
      if (n > 0) picks[t] = n;
      if (rows[t].r === "won") won.push(t); else if (rows[t].r === "lost") lost.push(t); else if (rows[t].r === "pending") pending.push(t);
    }
    onSave({ asOf: asOf.trim() || new Date().toLocaleDateString([], { month: "short", day: "numeric" }), picks, won, lost, pending });
  };
  // quick fills: mark every team with entries but no result
  const fillRest = (r) => setRows((p) => { const q = { ...p }; for (const t of teams) if (!q[t].r) q[t] = { ...q[t], r }; return q; });
  return (
    <div className="editor">
      <h3>{legLabel(leg)} — Circa's posted selections</h3>
      <div className="row">
        <label>As of <input type="text" value={asOf} onChange={(e) => setAsOf(e.target.value)} placeholder="e.g. Sep 21 (MNF pending)" style={{ width: 200 }} /></label>
        <span style={{ color: "#6f6c66" }}>Entries so far: <b>{total.toLocaleString()}</b></span>
        <button className="ghost" onClick={() => fillRest("pending")}>Rest = pending</button>
        <button className="ghost" onClick={() => fillRest("lost")}>Rest = lost</button>
      </div>
      <div className="grid">
        {teams.map((t) => {
          const col = COLORS[t] || ["#c9c6bf", "#1a1a1a"];
          return (
            <div className="g" key={t}>
              <span className="chip" style={{ background: col[0], color: col[1] }}>{t === "NOPICK" ? "No pick" : t}</span>
              <input className="num" type="number" min="0" placeholder="0" value={rows[t].n} onChange={(e) => set(t, "n", e.target.value)} />
              <select value={rows[t].r} onChange={(e) => set(t, "r", e.target.value)}>
                <option value="">–</option><option value="won">Won</option><option value="lost">Lost</option><option value="pending">Pending</option>
              </select>
            </div>
          );
        })}
      </div>
      <div className="row">
        <button className="btn" onClick={submit}>Save to GitHub</button>
        <button className="ghost" onClick={onCancel}>Cancel</button>
        <span style={{ color: "#6f6c66" }}>Teams with 0 entries are left out. Every team with entries needs a result before the leg's math is right.</span>
      </div>
    </div>
  );
}

function ContestEditor({ contest, onSave, onCancel }) {
  const [c, setC] = useState({ start: contest.start, pool: contest.pool, share: Math.round(contest.share * 100) });
  const f = (k) => (e) => setC((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="editor">
      <h3>Contest size</h3>
      <div className="row">
        <label>Starting entries <input className="num" type="number" value={c.start} onChange={f("start")} /></label>
        <label>Prize pool $ <input className="num" type="number" value={c.pool} onChange={f("pool")} style={{ width: 110 }} /></label>
        <label>Your share of each entry % <input className="num" type="number" value={c.share} onChange={f("share")} /></label>
      </div>
      <div className="row">
        <button className="btn" onClick={() => onSave({ start: +c.start || 0, pool: +c.pool || 0, share: (+c.share || 0) / 100 })}>Save to GitHub</button>
        <button className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function Chart({ pts, money, num, start }) {
  const Mini = ({ title, k, color, fmt, top }) => {
    const W = 360, H = 140, px = 30, py = 22;
    const xs = pts.map((_, i) => px + (i * (W - 2 * px)) / Math.max(1, pts.length - 1));
    const mx = top || Math.max(...pts.map((p) => p[k])) * 1.2 || 1;
    const y = (v) => H - py - ((H - 2 * py) * v) / mx;
    const d = pts.map((p, i) => (i ? "L" : "M") + xs[i].toFixed(1) + " " + y(p[k]).toFixed(1)).join(" ");
    return (
      <div className="chart" style={{ flex: 1, minWidth: 280 }}>
        <h3>{title}</h3>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} fontFamily="inherit" fontSize="10">
          <line x1={px} x2={W - px} y1={H - py} y2={H - py} stroke="#e4e2dc" />
          <path d={d} fill="none" stroke={color} strokeWidth="2" />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={xs[i]} cy={y(p[k])} r="3" fill={color} />
              <text x={xs[i]} y={y(p[k]) - 8} textAnchor="middle" fill={color} fontWeight="700">{fmt(p[k])}</text>
              <text x={xs[i]} y={H - 6} textAnchor="middle" fill="#6f6c66">{p.x}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <Mini title="Live entries by leg" k="live" color="#6f6c66" fmt={num} top={start * 1.15} />
      <Mini title="Your equity by leg" k="eq" color="#2e7a33" fmt={money} />
    </div>
  );
}
