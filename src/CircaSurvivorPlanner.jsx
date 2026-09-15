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
  return { spread: Math.round(-margin * 10) / 10, win: winFromMargin(margin), proj: true };
}

// ---------- True Win %: two-sided no-vig moneyline ----------
const impliedProb = (ml) => (ml > 0 ? 100 / (ml + 100) : -ml / (-ml + 100));
const validML = (ml) => Number.isFinite(ml) && Math.abs(ml) >= 100;
function devig(mlA, mlB) {
  if (!validML(mlA) || !validML(mlB)) return null;
  const qA = impliedProb(mlA), qB = impliedProb(mlB);
  return { a: qA / (qA + qB), b: qB / (qA + qB) };
}
// ---------- consensus True Win % across sportsbooks ----------
// Each book is de-vigged on its own two prices; the consensus is the MEDIAN of the books' home-win
// probabilities, and the away side is its complement (medians of the two sides need not sum to 1).
const STALE_MS = 48 * 3600 * 1000;   // a book whose quote is this much older than the freshest book's is left out
const BOOK_NAME = { pinnacle: "Pinnacle", betmgm: "BetMGM", draftkings: "DraftKings", fanduel: "FanDuel", williamhill_us: "Caesars", nflverse: "closing line (nflverse)" };
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const roundHalf = (v) => Math.round(v * 2) / 2;
// status by number of contributing books
const STATUS = { 0: "none", 1: "single", 2: "degraded" };
const statusFor = (n, closing) => (closing ? "closing" : STATUS[n] || "consensus");
const STATUS_TEXT = { consensus: "consensus of 3+ books", degraded: "2 books only (degraded)", single: "single book (provisional)", closing: "closing line from nflverse (game already played)", none: "no valid two-sided moneyline" };

// One game's books → per-book de-vigged probabilities with exclusion reasons, plus the consensus.
function consensusForGame(key, g) {
  const [away, home] = key.split("@");
  const kickoff = g.kickoff ? new Date(g.kickoff).getTime() : null;
  const books = g.books || (g.ml ? { [/nflverse/.test(g.source || "") ? "nflverse" : "draftkings"]: { asof: g.asof, ml: g.ml, spread: g.spread || {} } } : {});
  const rows = Object.entries(books).map(([bk, b]) => {
    const row = { book: bk, name: BOOK_NAME[bk] || bk, ml: b.ml?.[home] ?? null, oppMl: b.ml?.[away] ?? null, asof: b.asof || null, spread: b.spread?.[home] ?? null, pHome: null, excluded: null };
    const d = devig(row.ml, row.oppMl);
    if (!d) row.excluded = "no valid two-sided moneyline";
    else if (bk !== "nflverse" && kickoff && row.asof && new Date(row.asof).getTime() >= kickoff) row.excluded = "quoted after kickoff (in-game price)";
    else row.pHome = d.a;
    return row;
  });
  const fresh = rows.filter((r) => !r.excluded && r.asof).map((r) => new Date(r.asof).getTime());
  const newest = fresh.length ? Math.max(...fresh) : null;
  for (const r of rows) if (!r.excluded && r.asof && newest && newest - new Date(r.asof).getTime() > STALE_MS) { r.excluded = `stale (${Math.round((newest - new Date(r.asof).getTime()) / 3600000)} h older than the freshest book)`; r.pHome = null; }
  const valid = rows.filter((r) => !r.excluded);
  const closing = valid.length > 0 && valid.every((r) => r.book === "nflverse");
  const pHome = valid.length ? median(valid.map((r) => r.pHome)) : null;
  // reference book for the displayed raw prices: the contributing book closest to the consensus
  const ref = valid.length ? valid.reduce((a, r) => (Math.abs(r.pHome - pHome) < Math.abs(a.pHome - pHome) ? r : a)) : null;
  const sp = valid.map((r) => r.spread).filter((v) => v != null);
  const asof = valid.length ? valid.map((r) => r.asof).filter(Boolean).sort().pop() || null : null;
  return { key, away, home, kickoff: g.kickoff || null, rows, valid: valid.length, status: statusFor(valid.length, closing), pHome, ref, spreadHome: sp.length ? roundHalf(median(sp)) : null, asof };
}
// Turn one leg of data/odds.json ({ games: { "AWY@HOM": { kickoff, books: { <book>: { asof, ml, spread } } } } })
// into per-team lines. Only games with at least one valid two-sided moneyline get a Win %; a spread alone never does.
function linesFromOdds(legOdds) {
  const lines = {}, games = {}; let asof = null, n = 0; const counts = {};
  for (const [key, g] of Object.entries(legOdds?.games || {})) {
    const c = consensusForGame(key, g);
    games[key] = c;
    if (c.pHome == null) continue;
    const base = { market: true, status: c.status, n: c.valid, game: key };
    lines[c.home] = { ...base, win: c.pHome, ml: c.ref.ml, oppMl: c.ref.oppMl, refBook: c.ref.name, spread: c.spreadHome };
    lines[c.away] = { ...base, win: 1 - c.pHome, ml: c.ref.oppMl, oppMl: c.ref.ml, refBook: c.ref.name, spread: c.spreadHome == null ? null : -c.spreadHome };
    n++; counts[c.status] = (counts[c.status] || 0) + 1;
    if (!asof || (c.asof && c.asof > asof)) asof = c.asof;
  }
  return { lines, detail: games, asof, games: n, counts };
}
// EV_i = w_i / (p_i + sum over other games of p_j w_j), scaled so the field's pick-weighted average = 1.00
// (the scale Atlas / SurvivorGrid use). Games without a Win % are left out of the denominator, which flatters
// everyone else, so the caller gets the coverage and blanks EV when it is too low to trust.
const EV_MIN_COVERAGE = 0.75;
function computeEV(legId, rows) {
  const teams = Object.keys(OPP[legId]);
  const gamesTotal = teams.length / 2;
  const covered = teams.filter((t) => rows[t].win != null).length / 2;
  const coverage = gamesTotal ? covered / gamesTotal : 0;
  for (const t of teams) { rows[t].raw = null; rows[t].ev = null; }
  if (coverage < EV_MIN_COVERAGE) return { coverage, covered, gamesTotal, blanked: true };
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
  const mean = psum > 0 ? wsum / psum : 1;
  for (const t of teams) { const r = rows[t]; r.ev = r.raw == null ? null : r.raw / mean; }
  return { coverage, covered, gamesTotal, blanked: false };
}
// Everything the model needs, assembled from the four data files.
function buildData({ picks, actuals, odds, ratings }) {
  const legs = {};
  for (const l of LEGS) {
    const r = linesFromOdds(odds?.legs?.[l.id]);
    if (r.games) legs[l.id] = { ...r, gamesTotal: Object.keys(OPP[l.id]).length / 2, books: odds.books || [] };
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
// Fit a, b to every leg that has both actuals and lines (grid search).
// The miss on each team is weighted by that team's actual share (plus a small floor so ignored teams still
// count a little), because EV depends almost entirely on the few teams the field piles onto.
// A mild penalty holds the knobs near PRIOR while there are only a week or two of actuals; once several
// weeks accumulate the evidence outweighs it and the knobs go wherever Circa's numbers say.
const PRIOR = { a: 8, b: 1.5 };
const PRIOR_WEIGHT = 0.5;        // roughly "one week of evidence"
const SHARE_FLOOR = 0.02;
function fitParams(data) {
  const legs = Object.keys(data.actuals).filter((id) => OPP[id] && Object.keys(OPP[id]).some((t) => marketLine(id, t, data)));
  if (!legs.length) return { ...PRIOR, legs: 0, err: null };
  let best = null;
  for (let a = 2; a <= 24; a += 1) for (let b = 0; b <= 4; b += 0.25) {
    let err = 0;
    for (const id of legs) {
      const act = data.actuals[id], tot = Object.values(act.picks).reduce((x, y) => x + y, 0);
      const m = modelPick(id, data, { a, b });
      for (const t of Object.keys(OPP[id])) { const share = (act.picks[t] || 0) / tot; err += (share + SHARE_FLOOR) * Math.abs((m[t] || 0) - share); }
    }
    const penalty = PRIOR_WEIGHT * (((a - PRIOR.a) / PRIOR.a) ** 2 + ((b - PRIOR.b) / PRIOR.b) ** 2);
    const score = err + penalty;
    if (!best || score < best.score) best = { a, b, err, score, legs: legs.length };
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

export { linesFromOdds, consensusForGame, computeEV, EV_MIN_COVERAGE, buildData, devig, fieldTimeline, modelPick, fitParams, availability };

const CSS = `
/* ---- tokens: paper, ink, one green ---- */
.csp { --paper:#FBFAF7; --panel:#F4F2EC; --surface:#FFFFFF; --ink:#17181C; --ink2:#5B5E66; --ink3:#9A9DA6; --rule:#E7E5DF; --rule2:#D6D3CB;
  --green:#2F8F3E; --green-ink:#1C5E2A; --green-bg:#DDF3DC; --sand:#F3EFE3; --sand-ink:#7A5A12; --amber:#C98A1A; --red:#D64545;
  --th:40px; --rh:34px; --cw:54px;
  display:flex; flex-direction:column; height:100vh; background:var(--paper); color:var(--ink);
  font-family:"IBM Plex Sans", -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; font-size:13px; font-variant-numeric:tabular-nums; -webkit-font-smoothing:antialiased; }
.csp * { box-sizing:border-box; }
.csp h1 { font-size:20px; font-weight:600; letter-spacing:-0.01em; margin:0; display:flex; align-items:center; gap:14px; white-space:nowrap; }
.csp h1 .ver { font-size:11px; font-weight:400; color:var(--ink3); }

/* ---- top bar ---- */
.csp .bar { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:12px 16px 10px; }
.csp .bar .left { display:flex; align-items:center; gap:18px; min-width:0; flex-wrap:wrap; }
.csp .ctl { display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0; }
.csp .ctl .row { display:flex; gap:8px; align-items:center; min-height:32px; }
.csp .ctl .note { font-size:11px; color:var(--ink3); padding-right:2px; min-height:14px; line-height:14px; }
.csp .ctl .note.msg { color:var(--ink); }
.csp .ctl .note.err { color:var(--red); }
.csp .who { font-size:12px; color:var(--ink2); }
.csp .link { background:none; border:none; padding:0 4px; font:inherit; font-size:12px; color:var(--ink2); cursor:pointer; text-decoration:underline; text-underline-offset:3px; }
.csp .link:hover { color:var(--ink); }

/* one control system */
.csp .btn, .csp .ghost, .csp .ctl select { height:32px; line-height:30px; padding:0 12px; font:inherit; font-size:13px; font-weight:500; border-radius:8px; border:1px solid var(--rule2); background:var(--surface); color:var(--ink); cursor:pointer; white-space:nowrap; }
.csp .btn:hover, .csp .ghost:hover, .csp .ctl select:hover { border-color:var(--ink3); }
.csp .btn:focus-visible, .csp .ghost:focus-visible, .csp .ctl select:focus-visible, .csp .seg button:focus-visible, .csp .views button:focus-visible { outline:2px solid var(--ink); outline-offset:2px; }
.csp .btn { background:var(--ink); color:#fff; border-color:var(--ink); }
.csp .btn:hover { background:#2a2c33; border-color:#2a2c33; }
.csp .btn:disabled, .csp .ghost:disabled { opacity:.45; cursor:default; }
.csp .ghost.on { background:var(--panel); border-color:var(--ink3); }
.csp .ctl select { appearance:none; -webkit-appearance:none; font-weight:600; padding-right:30px; background:var(--surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5l3.5 3.5 3.5-3.5' fill='none' stroke='%2317181C' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center; }
/* segmented controls: views and entries */
.csp .views, .csp .seg { display:inline-flex; padding:3px; background:var(--panel); border-radius:9px; gap:2px; }
.csp .views button, .csp .seg button { height:26px; line-height:26px; padding:0 12px; font:inherit; font-size:13px; font-weight:500; border:none; border-radius:6px; background:transparent; color:var(--ink2); cursor:pointer; white-space:nowrap; }
.csp .views button:hover, .csp .seg button:hover { color:var(--ink); }
.csp .views button.on, .csp .seg button.on { background:var(--surface); color:var(--ink); box-shadow:0 1px 2px rgba(0,0,0,.10); }
.csp .seg button .n { margin-left:6px; font-size:11px; color:var(--ink3); font-weight:400; }
.csp .seg button.on .n { color:var(--ink2); }

/* ---- the board ---- */
.csp .wrap { flex:1; min-height:0; overflow:auto; background:var(--surface); border-top:1px solid var(--rule); }
.csp table { border-collapse:separate; border-spacing:0; font-size:12px; }
.csp th, .csp td { padding:0; border-bottom:1px solid var(--rule); white-space:nowrap; }
.csp th { position:sticky; top:0; z-index:3; height:var(--th); background:var(--paper); color:var(--ink2); font-weight:500; font-size:12px; text-align:center; vertical-align:middle; line-height:1.15; cursor:pointer; user-select:none; border-bottom:1px solid var(--rule2); }
.csp th:hover { color:var(--ink); }
.csp th .lsub { display:block; font-weight:400; font-size:10px; color:var(--ink3); margin-top:1px; }
.csp th.sorted { color:var(--ink); font-weight:600; box-shadow:inset 0 -2px 0 var(--ink); }
.csp th.hol { color:var(--sand-ink); }
.csp th.hol .lsub { color:var(--sand-ink); opacity:.8; }
.csp .wrap.scrolled thead th { box-shadow:0 4px 10px rgba(23,24,28,.06); }
.csp .wrap.scrolled thead th.sorted { box-shadow:inset 0 -2px 0 var(--ink), 0 4px 10px rgba(23,24,28,.06); }
/* selected week: a tinted column */
.csp th.curcol { background:var(--sand); color:var(--ink); font-weight:600; }
.csp td.curcol { background:var(--sand); }
.csp .sum td.curcol { background:#ECE8DA; }

/* frozen left block: EV | W% | P% | Team */
.csp .L { position:sticky; z-index:2; background:var(--surface); height:var(--rh); text-align:center; }
.csp .L.ev { left:0; width:48px; min-width:48px; }
.csp .L.wp { left:48px; width:48px; min-width:48px; }
.csp .L.pp { left:96px; width:48px; min-width:48px; }
.csp .L.team { left:144px; width:120px; min-width:120px; text-align:left; padding:0 8px 0 12px; font-weight:600; }
.csp .L.entry { left:48px; width:216px; min-width:216px; text-align:center; padding:0; }
.csp th.L { z-index:4; background:var(--paper); }
.csp th.L.team { text-align:left; padding-left:12px; }
.csp th.L.entry { cursor:default; }
.csp th.blank, .csp .sum td.blank { background:var(--panel); border-bottom-color:var(--panel); cursor:default; }
.csp .sum td.L.blank { z-index:5; }
.csp td.L.num { color:var(--ink2); }
.csp td.L.num.blank { color:var(--ink3); }
.csp td.L.ev.num { color:var(--ink); font-weight:600; }
.csp td.L.num.top { color:var(--green-ink); }
.csp td.L.num.weak::after { content:""; display:inline-block; width:5px; height:5px; border-radius:50%; background:var(--amber); margin-left:4px; vertical-align:2px; }
.csp .team { box-shadow:inset 3px 0 0 var(--tc); }
.csp .team .hd { display:inline-block; width:6px; height:6px; border-radius:50%; margin-left:5px; vertical-align:1px; background:var(--sand-ink); opacity:.7; }
.csp .team .hd.x { background:var(--red); }
.csp .team .used { font-weight:400; color:var(--ink3); font-size:10px; margin-left:6px; }
.csp tr.gone .team .nm { text-decoration:line-through; color:var(--ink3); }
.csp tr.gone .team { box-shadow:inset 3px 0 0 var(--rule2); }

/* week cells: one line, favorite strength as a faint tint */
.csp td.c { width:var(--cw); min-width:var(--cw); height:var(--rh); text-align:center; position:relative; cursor:pointer; user-select:none; color:var(--ink); background:rgba(47,143,62,var(--fav,0)); line-height:1.1; padding-top:1px; }
.csp.ro td.c { cursor:default; }
.csp td.c .sp { display:block; color:var(--ink2); font-size:10px; margin-top:2px; }
.csp td.c .sp.proj { color:var(--ink3); font-style:italic; }
.csp td.c.away { color:var(--ink2); }
.csp td.c.bye { background:var(--panel); cursor:default; }
.csp td.c.dead { color:var(--ink3); text-decoration:line-through; cursor:not-allowed; }
.csp td.c.dead .sp, .csp td.c.dim .sp { color:var(--ink3); text-decoration:none; }
.csp td.c.dim { color:var(--ink3); }
.csp td.c.pick { background:var(--green-bg); color:var(--green-ink); font-weight:600; text-decoration:none; }
.csp td.c.pick .sp { color:var(--green-ink); }
.csp:not(.ro) td.c:not(.bye):not(.dead):hover { box-shadow:inset 0 0 0 2px var(--ink); }
.csp td.c .oth { position:absolute; top:2px; right:4px; font-size:9px; color:var(--ink3); letter-spacing:1px; }
.csp td.c.pick .oth { color:var(--green-ink); }

.csp td.fv { width:64px; min-width:64px; height:var(--rh); padding:0 8px; }
.csp td.fv .fvbar { height:6px; background:var(--panel); border-radius:3px; overflow:hidden; }
.csp td.fv .fvbar i { display:block; height:100%; background:var(--green); border-radius:3px; }
.csp th.fv { width:64px; min-width:64px; }

/* entries panel on top of the board */
.csp .sum td { position:sticky; top:var(--top); z-index:2; background:var(--panel); height:var(--rh); text-align:center; font-weight:500; cursor:pointer; border-bottom-color:var(--rule); }
.csp .sum td.L { z-index:5; background:var(--panel); }
.csp .sum td.entry { color:var(--ink2); }
.csp .sum td.entry.on { color:var(--ink); font-weight:600; }
.csp .sum td.s { width:var(--cw); min-width:var(--cw); }
.csp .sum td.s .chip { display:inline-block; min-width:38px; padding:2px 5px; border-radius:5px; font-size:11px; font-weight:600; line-height:16px; }
.csp .sum td.empty { color:var(--rule2); font-weight:400; }
.csp .sum td.dupe .chip { box-shadow:0 0 0 2px var(--red); }
.csp .sum tr.gap td { height:8px; background:var(--paper); cursor:default; position:sticky; top:calc(var(--th) + var(--n) * var(--rh)); z-index:4; border-bottom:1px solid var(--rule); }
.csp .sum tr.hdr2 th { top:calc(var(--th) + var(--n) * var(--rh) + 8px); }
.csp .sum tr.hdr2 th.L { z-index:5; }
.csp thead th.entry, .csp thead th.blank, .csp .sum tr:first-child td { border-top:none; }

/* ---- panels: sign-in, audit, editors ---- */
.csp .panel { background:var(--surface); border-top:1px solid var(--rule); border-bottom:1px solid var(--rule); padding:12px 16px; }
.csp .panel .f { font-size:12px; color:var(--ink2); margin-bottom:8px; line-height:1.5; max-width:72ch; }
.csp .panel .f b { color:var(--ink); font-weight:600; }
.csp .panel .f code, .csp .audit .f code { background:var(--panel); padding:1px 5px; border-radius:4px; font-family:inherit; }
.csp .panel input[type=text], .csp .panel input[type=password], .csp .panel input[type=number] { height:32px; font:inherit; font-size:13px; padding:0 10px; border:1px solid var(--rule2); border-radius:8px; background:var(--surface); }
.csp .panel .row { display:flex; gap:8px; margin-top:6px; align-items:center; flex-wrap:wrap; }
.csp .audit { background:var(--surface); border-top:1px solid var(--rule); border-bottom:1px solid var(--rule); padding:12px 16px; max-height:46vh; overflow:auto; }
.csp .audit .f { font-size:12px; color:var(--ink2); margin-bottom:10px; line-height:1.55; max-width:110ch; }
.csp .audit .f b { color:var(--ink); font-weight:600; }
.csp .audit table { border-collapse:collapse; font-size:12px; }
.csp .audit th { position:static; height:auto; padding:6px 10px; background:transparent; color:var(--ink2); font-size:11px; font-weight:500; text-align:right; border:none; border-bottom:1px solid var(--rule2); cursor:default; }
.csp .audit td { padding:0 10px; height:26px; text-align:right; border:none; border-bottom:1px solid var(--rule); color:var(--ink2); }
.csp .audit th:first-child, .csp .audit td:first-child { text-align:left; font-weight:600; color:var(--ink); }
.csp .audit td.fin { font-weight:600; color:var(--ink); }
.csp .audit td.mut { color:var(--ink3); }

/* ---- actuals ---- */
.csp .act { flex:1; min-height:0; overflow:auto; padding:4px 16px 24px; border-top:1px solid var(--rule); background:var(--surface); }
.csp .strip { display:flex; align-items:stretch; gap:0; margin:10px 0 18px; flex-wrap:wrap; }
.csp .strip .fig { padding:6px 28px 6px 0; margin-right:28px; border-right:1px solid var(--rule); }
.csp .strip .fig:last-child { border-right:none; }
.csp .strip .v { font-size:24px; font-weight:600; letter-spacing:-0.01em; line-height:1.1; }
.csp .strip .v.up { color:var(--green-ink); }
.csp .strip .k { font-size:12px; color:var(--ink2); margin-top:3px; }
.csp .strip .actions { display:flex; flex-direction:column; gap:6px; justify-content:center; margin-left:auto; }
.csp .legcard { border:1px solid var(--rule); border-radius:10px; margin-bottom:16px; overflow:hidden; }
.csp .legcard .hd2 { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 14px; background:var(--paper); border-bottom:1px solid var(--rule); }
.csp .legcard .hd2 .legsel { height:32px; font:inherit; font-size:13px; font-weight:600; color:var(--ink); border:1px solid var(--rule2); border-radius:8px; padding:0 30px 0 12px; cursor:pointer; appearance:none; -webkit-appearance:none; background:var(--surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5l3.5 3.5 3.5-3.5' fill='none' stroke='%2317181C' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center; }
.csp .legcard .hd2 .legsel:hover { border-color:var(--ink3); }
.csp .legcard .hd2 .m { font-size:12px; color:var(--ink2); }
.csp .legcard .hd2 .m b { color:var(--ink); font-weight:600; }
.csp .dist { width:100%; border-collapse:collapse; font-size:12px; }
.csp .dist th { position:static; height:auto; background:transparent; color:var(--ink2); font-size:11px; font-weight:500; padding:8px 12px; text-align:right; border:none; border-bottom:1px solid var(--rule2); cursor:default; }
.csp .dist th:first-child, .csp .dist td:first-child { text-align:left; }
.csp .dist td { padding:0 12px; height:30px; text-align:right; border:none; border-bottom:1px solid var(--rule); color:var(--ink2); }
.csp .dist td:nth-child(2) { color:var(--ink); font-weight:500; }
.csp .dist .chip { display:inline-block; min-width:44px; text-align:center; padding:3px 7px; border-radius:5px; font-weight:600; font-size:11px; }
.csp .dist .bar { display:inline-block; height:6px; border-radius:3px; vertical-align:middle; background:var(--green); opacity:.55; }
.csp .dist tr.L .bar { background:var(--red); }
.csp .dist tr.P .bar { background:var(--amber); }
.csp .dist .res { font-weight:600; }
.csp .dist tr.W .res { color:var(--green-ink); }
.csp .dist tr.L .res { color:var(--red); }
.csp .dist tr.P .res { color:var(--amber); }
.csp .dist .elim { color:var(--red); }
.csp .chart { border:1px solid var(--rule); border-radius:10px; padding:12px 14px; margin-bottom:16px; flex:0 1 440px; max-width:480px; }
.csp .chart h3 { font-size:12px; color:var(--ink2); margin:0 0 4px; font-weight:500; }
.csp .editor { border:1px solid var(--rule); border-radius:10px; margin-bottom:16px; padding:12px 16px; }
.csp .editor h3 { font-size:14px; font-weight:600; margin:0 0 10px; }
.csp .editor .row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:10px; font-size:12px; color:var(--ink2); }
.csp .editor label { display:flex; gap:6px; align-items:center; color:var(--ink2); }
.csp .editor input, .csp .editor select { height:28px; font:inherit; font-size:12px; padding:0 8px; border:1px solid var(--rule2); border-radius:6px; background:var(--surface); color:var(--ink); }
.csp .editor input.num { width:84px; text-align:right; }
.csp .editor .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:6px 16px; margin:8px 0 12px; }
.csp .editor .grid .g { display:flex; gap:6px; align-items:center; font-size:12px; }
.csp .editor .grid .g .chip { display:inline-block; min-width:44px; text-align:center; padding:3px 6px; border-radius:5px; font-weight:600; font-size:11px; }
@media (prefers-reduced-motion: no-preference) { .csp .btn, .csp .ghost, .csp .views button, .csp .seg button { transition:background .12s, border-color .12s, color .12s; } }
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
  const sayTimer = useRef(null);
  const say = (msg, err = false) => {
    setStatus(msg); setStatusErr(err);
    clearTimeout(sayTimer.current);
    if (msg && !err && !/…$/.test(msg)) sayTimer.current = setTimeout(() => setStatus(""), 4000);   // "Saving…"-style messages stay until replaced
  };

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
  // once data is in, jump to the first week that has no Circa results yet (never earlier than today's week)
  const jumped = useRef(false);
  useEffect(() => {
    if (!loaded || jumped.current) return; jumped.current = true;
    const open = LEGS.find((l) => !files.actuals.json?.legs?.[l.id]);
    if (open && LEGS.findIndex((l) => l.id === open.id) > LEGS.findIndex((l) => l.id === legId)) setLegId(open.id);
  }, [loaded]); // eslint-disable-line
  useEffect(() => {
    if (!token) { setUser(null); return; }
    let live = true;
    whoAmI(token).then((login) => { if (live) { setUser(login); say(""); } })
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
      say(`Saved ${fmtTime(new Date().toISOString())}`);
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
  const statsAll = useMemo(() => {
    const act = data.actuals[legId];
    const actTot = act ? Object.values(act.picks).reduce((a, b) => a + b, 0) : 0;
    const modelP = modelPick(legId, data, params);
    const hasModel = Object.keys(modelP).length > 0;
    const pick = act ? Object.fromEntries(Object.entries(act.picks).map(([t, n]) => [t, n / actTot])) : modelP;
    const rows = {};
    for (const t of ALL_TEAMS) {
      const mk = marketLine(legId, t, data);          // True Win % (market only) — null if no valid two-sided ML
      const disp = lineFor(legId, t, data);           // spread for display; may be a projection
      rows[t] = { win: mk ? mk.win : null, ml: mk ? mk.ml : null, oppMl: mk ? mk.oppMl : null, status: mk ? mk.status : "none", n: mk ? mk.n : 0, refBook: mk ? mk.refBook : null,
        pick: (act || hasModel) ? (pick[t] ?? (disp ? 0 : null)) : null, spread: disp ? disp.spread : null, proj: disp ? disp.proj : false, pm: modelP[t], act: !!act };
    }
    const ev = computeEV(legId, rows);
    for (const t of ALL_TEAMS) rows[t].fv = data.ratings ? fvFor(legId, t, data) : null;
    return { rows, ev };
  }, [data, legId, params]);
  const { rows: stats, ev: evInfo } = statsAll;
  const maxFv = Math.max(0.01, ...ALL_TEAMS.map((t) => stats[t].fv || 0));
  const topEv = Math.max(...ALL_TEAMS.map((t) => stats[t].ev || 0));
  const evNote = evInfo.blanked ? `EV unavailable: only ${evInfo.covered}/${evInfo.gamesTotal} games have a Win % (need ${Math.round(EV_MIN_COVERAGE * 100)}%)`
    : evInfo.coverage < 1 ? `EV based on ${evInfo.covered}/${evInfo.gamesTotal} games — teams without a Win % are left out, which flatters the rest` : null;

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
  const flags = legInfo ? [legInfo.counts.degraded && `${legInfo.counts.degraded} at 2 books`, legInfo.counts.single && `${legInfo.counts.single} single-book`].filter(Boolean).join(", ") : "";
  const stamp = legInfo ? `${legInfo.counts.closing === legInfo.games ? "closing lines" : "book consensus"} · ${fmtTime(legInfo.asof)} · ${legInfo.games}/${legInfo.gamesTotal} games${flags ? ` (${flags})` : ""}` : "no lines yet for this leg";

  const Header = ({ top }) => (
    <>
      {top ? <><th className="L ev blank" /><th className="L entry" colSpan={3}>Entry</th></> : <>
        <th className={"L ev" + (sort.key === "ev" ? " sorted" : "") + (evNote ? " partial" : "")} onClick={() => clickSort("ev")} title={evNote || `EV for ${legLabel(cur)}`}>EV{evNote ? "*" : ""}</th>
        <th className={"L wp" + (sort.key === "wp" ? " sorted" : "")} onClick={() => clickSort("wp")} title={`True Win % — median of each book's no-vig moneyline probability · ${stamp}`}>W%</th>
        <th className={"L pp" + (sort.key === "pp" ? " sorted" : "")} onClick={() => clickSort("pp")} title="Circa pick popularity (actual once posted, field model before)">P%</th>
        <th className={"L team" + (sort.key === "team" ? " sorted" : "")} onClick={() => clickSort("team")}>Team</th>
      </>}
      {LEGS.map((l) => (
        <th key={l.id} className={(l.holiday ? "hol" : "") + (sort.key === l.id ? " sorted" : "") + (l.id === legId ? " curcol" : "")} title={`${legLabel(l)} — click to sort by spread`} onClick={() => clickSort(l.id)}>
          {l.label}{l.sub && <span className="lsub">{l.sub}</span>}
        </th>
      ))}
      {top ? <th className="fv blank" /> : <th className={"fv" + (sort.key === "fv" ? " sorted" : "")} onClick={() => clickSort("fv")} title="Future value: strong-favorite spots left after this leg">Future</th>}
    </>
  );
  // books contributing to this leg's lines, for the note under the controls
  const lineNote = (() => {
    if (!legInfo) return "No lines yet for this week";
    const books = new Set();
    for (const g of Object.values(legInfo.detail)) for (const r of g.rows) if (!r.excluded) books.add(r.book);
    const real = [...books].filter((b) => b !== "nflverse").length;
    if (legInfo.counts.closing) return `Closing lines · ${legInfo.games}/${legInfo.gamesTotal} games`;      // week already played
    return `Lines updated ${fmtTime(legInfo.asof)} · ${real} sportsbook${real === 1 ? "" : "s"}`;
  })();

  return (
    <div className={"csp" + (canEdit ? "" : " ro")} onMouseDown={(e) => { if (e.target.closest("button")) e.preventDefault(); }}>
      <style>{CSS}</style>
      <div className="bar">
        <div className="left">
          <h1>Circa Survivor 2026 <span className="ver">v{VERSION}</span></h1>
          <span className="views">
            <button className={view === "planner" ? "on" : ""} onClick={() => setView("planner")}>Planner</button>
            <button className={view === "actuals" ? "on" : ""} onClick={() => setView("actuals")}>Actuals</button>
          </span>
          {view === "planner" && <span className="seg">
            {entries.map((e, i) => (
              <button key={i} className={i === active ? "on" : ""} onClick={() => setActive(i)} title="Plan this entry">
                {e.name}<span className="n">{Object.keys(e.picks).length}/20</span>
              </button>
            ))}
          </span>}
        </div>
        <div className="ctl">
          <div className="row">
            {view === "planner" && <>
              <select value={legId} onChange={(e) => setLegId(e.target.value)} title="Week to plan">
                {LEGS.map((l) => <option key={l.id} value={l.id}>{legLabel(l)}</option>)}
              </select>
              <button className={"ghost" + (audit ? " on" : "")} onClick={() => setAudit((a) => !a)} title="Show how W% and P% were built">
                {data.actuals[legId] ? "P% = Circa actuals" : "P% = field model"} {audit ? "▴" : "▾"}
              </button>
              {canEdit && <button className="btn" onClick={updateLines} disabled={updating} title="Pull fresh moneylines from the sportsbooks now (otherwise twice a day)">{updating ? "Updating…" : "Update lines"}</button>}
            </>}
            {canEdit ? <><span className="who">{user}</span><button className="link" onClick={signOut}>Sign out</button></>
              : <button className="link" onClick={() => setSignin((s) => !s)}>Sign in to edit</button>}
          </div>
          <div className={"note" + (status ? (statusErr ? " err" : " msg") : "")} title={view === "planner" && !status ? `Lines update automatically twice a day. ${stamp}` : undefined}>{!loaded ? "Loading…" : status ? status : view === "planner" ? lineNote : ""}</div>
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
      {view === "planner" && audit && <AuditPanel legId={legId} data={data} params={params} merr={merr} stats={stats} evNote={evNote} />}
      {view === "planner" && <>

      <div className="wrap" onScroll={(e) => e.currentTarget.classList.toggle("scrolled", e.currentTarget.scrollTop > 2)}>
        <table style={{ "--n": entries.length }}>
          <thead><tr><Header top /></tr></thead>
          <tbody className="sum">
            {entries.map((e, i) => (
              <tr key={"s" + i} style={{ "--top": `calc(var(--th) + ${i} * var(--rh))` }}>
                <td className="L ev blank" /><td className={"L entry" + (i === active ? " on" : "")} colSpan={3} onClick={() => setActive(i)} title="Click to plan this entry">{e.name}</td>
                {LEGS.map((l) => {
                  const t = e.picks[l.id];
                  const dupe = t && entries.some((o, j) => j !== i && o.picks[l.id] === t);
                  return (
                    <td key={l.id} className={"s" + (t ? "" : " empty") + (dupe ? " dupe" : "") + (l.id === legId ? " curcol" : "")}
                        title={dupe ? "Another entry has the same pick this week" : ""}
                        onClick={() => setActive(i)}>{t ? <span className="chip" style={{ background: COLORS[t][0], color: COLORS[t][1] }}>{t}</span> : "·"}</td>
                  );
                })}
                <td className="blank" />
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
                  <td className={"L wp num" + (st.win == null ? " blank" : "") + (st.status === "single" || st.status === "degraded" ? " weak" : "")} title={inLeg ? (st.win == null ? "No two-sided moneyline posted yet for this game" : `${pct(st.win)} — ${STATUS_TEXT[st.status]}${st.status !== "closing" ? ` (${st.n})` : ""} · e.g. ${st.refBook} ${fmtSp(st.ml)} / ${fmtSp(st.oppMl)}`) : ""}>{inLeg ? pct(st.win) : ""}</td>
                  <td className={"L pp num" + (st.pick == null ? " blank" : "")} title={inLeg ? (st.act ? "Circa actual" : `field model ${pct(st.pm)}`) : ""}>{inLeg ? (st.pick == null ? "–" : st.pick < 0.005 ? "<1%" : Math.round(st.pick * 100) + "%") : ""}</td>
                  <td className="L team" style={{ "--tc": COLORS[team][0] }}>
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
                    if (l.id === legId) cls += " curcol" + (team === sortedTeams[sortedTeams.length - 1] ? " last" : "");
                    if (!g) cls += " bye"; else if (pickHere) cls += " pick"; else if (dead) cls += " dead"; else if (legTaken) cls += " dim"; else if (!g.home) cls += " away";
                    const label = !g ? "" : (g.neutral ? "n " : g.home ? "vs " : "@ ") + g.opp;
                    const fav = ln && ln.spread != null && ln.spread < 0 && !dead ? Math.min(1, -ln.spread / 14) : 0;
                    const tip = !g ? `${team} bye` : dead ? `${team} already used (${legLabel(LEGS.find((x) => x.id === usedLeg))})`
                      : `${legLabel(l)}: ${team} ${g.home || g.neutral ? "vs" : "at"} ${g.opp}${g.neutral ? " (neutral)" : ""}${ln ? ` · ${fmtSp(ln.spread)}${ln.market ? ` · ML ${fmtSp(ln.ml)} / ${fmtSp(ln.oppMl)} · True Win ${pct(ln.win)}` : ln.proj ? ` · projected ${pct(ln.win)} (ratings, not market)` : ""}` : ""}${others ? ` · also picked by entry ${others.split("").join(" and ")}` : ""}${canEdit ? "" : " · sign in to change picks"}`;
                    return (
                      <td key={l.id} className={cls} title={tip} style={fav > 0 && !pickHere ? { "--fav": (0.03 + 0.15 * fav).toFixed(3) } : undefined} onClick={() => g && !dead && setPick(l.id, team)}>
                        {label}
                        {ln && <span className={"sp" + (ln.proj ? " proj" : "")}>{ln.spread != null ? fmtSp(ln.spread) : ln.market ? "ML " + fmtSp(ln.ml) : ""}</span>}
                        {others && <span className="oth" title={`Also picked by entry ${others.split("").join(" and ")}`}>{others}</span>}
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

      </>}
    </div>
  );
}

// ---------- P% audit panel ----------
function AuditPanel({ legId, data, params, merr, stats, evNote }) {
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
          <b>Field model</b>: <code>win^{params.a} × e^(−{params.b} × future value) × availability</code>, normalized across teams favored this leg. Teams under 50% get 0. Fit on {params.legs} leg(s) of Circa actuals, weighting each team's miss by its actual share and holding the knobs near {PRIOR.a} / {PRIOR.b} until several weeks of data outweigh that{merr ? <> — average miss so far {pc(merr.err)} per team</> : null}.
        </>}
        <br /><b>True Win %</b>: {leg.games ? <>each book's two-sided moneyline is de-vigged on its own, the consensus is the <b>median</b> of the books' home-win probabilities (away = 1 − home) as of {fmtTime(leg.asof)} — {leg.games}/{leg.gamesTotal} games. Books asked: {(leg.books || []).map((b) => BOOK_NAME[b] || b).join(", ")}. 3+ books = normal, 2 = degraded, 1 = single-book (provisional); a quote more than 48 h older than the freshest book's, or taken after kickoff, is excluded.</> : "no moneylines captured for this leg yet (books post them about a week out)"}. Spreads and future weeks are display/projection only and never feed Win %.
        {evNote && <><br /><b>EV coverage</b>: {evNote}.</>}
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
      {leg.detail && Object.keys(leg.detail).length > 0 && <>
        <div className="f" style={{ marginTop: 12 }}><b>Market detail by game</b> — every quote we hold, how it was de-vigged, and why any was left out.</div>
        <table>
          <thead><tr><th>Game</th><th>Consensus (home)</th><th>Status</th><th>Book</th><th>Home / away ML</th><th>Book no-vig (home)</th><th>Quoted</th><th>Note</th></tr></thead>
          <tbody>
            {Object.values(leg.detail).sort((a, b) => (a.kickoff || "").localeCompare(b.kickoff || "")).flatMap((g) => g.rows.map((r, i) => (
              <tr key={g.key + r.book}>
                <td>{i === 0 ? `${g.away} @ ${g.home}` : ""}</td>
                <td className={i === 0 ? "fin" : "mut"}>{i === 0 ? (g.pHome == null ? "–" : `${g.home} ${pc(g.pHome, 1)}`) : ""}</td>
                <td className="mut">{i === 0 ? `${STATUS_TEXT[g.status]}${g.status !== "closing" && g.status !== "none" ? ` (${g.valid})` : ""}` : ""}</td>
                <td className={r.excluded ? "mut" : ""}>{r.name}</td>
                <td className={r.excluded ? "mut" : ""}>{r.ml != null ? `${mlTxt(r.ml)} / ${mlTxt(r.oppMl)}` : "–"}</td>
                <td className={r.excluded ? "mut" : ""}>{r.pHome == null ? "–" : pc(r.pHome, 1)}</td>
                <td className="mut">{r.asof ? fmtTime(r.asof) : "–"}</td>
                <td className="mut">{r.excluded ? `excluded: ${r.excluded}` : ""}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </>}
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
      <div className="strip">
        <div className="fig"><div className="v">{num(contest.start)}</div><div className="k">entries started, {money(contest.pool)} pool</div></div>
        <div className="fig"><div className="v">{num(last ? last.after : contest.start)}</div><div className="k">still alive{last ? `, ${pctOf(contest.start - last.after, contest.start)} out` : ""}</div></div>
        <div className="fig"><div className="v">{money(last ? last.value : value0)}</div><div className="k">implied value per entry</div></div>
        <div className="fig"><div className={"v" + (equityNow > equity0 ? " up" : "")}>{money(equityNow)}</div><div className="k">your equity, {nAlive} of {entries.length} alive</div></div>
        {canEdit && <div className="actions">
          {nextLeg && <button className="btn" onClick={() => setEditing(nextLeg.id)}>Enter {legLabel(nextLeg)} results</button>}
          <div style={{ display: "flex", gap: 6 }}>
            {selLeg && <button className="ghost" onClick={() => setEditing(selLeg)}>Edit {legLabel(LEGS.find((l) => l.id === selLeg))}</button>}
            <button className="ghost" onClick={() => setEditing("contest")}>Contest size</button>
          </div>
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
              <span className="m"><b>{num(r.before)}</b> in → <b>{num(r.lost)}</b> out ({pctOf(r.lost, r.before)}) → <b>{num(r.after)}</b> live</span>
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
  const set = (t, k, v) => setRows((p) => ({ ...p, [t]: { ...p[t], [k]: v } }));
  const total = teams.reduce((s, t) => s + (parseInt(rows[t].n, 10) || 0), 0);
  const submit = () => {
    const picks = {}, won = [], lost = [], pending = [];
    for (const t of teams) {
      const n = parseInt(rows[t].n, 10);
      if (n > 0) picks[t] = n;
      if (rows[t].r === "won") won.push(t); else if (rows[t].r === "lost") lost.push(t); else if (rows[t].r === "pending") pending.push(t);
    }
    onSave({ asOf: new Date().toLocaleDateString([], { month: "short", day: "numeric" }), picks, won, lost, pending });
  };
  // quick fills: mark every team with entries but no result
  const fillRest = (r) => setRows((p) => { const q = { ...p }; for (const t of teams) if (!q[t].r) q[t] = { ...q[t], r }; return q; });
  return (
    <div className="editor">
      <h3>{legLabel(leg)} — Circa's posted selections</h3>
      <div className="row">
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
      <div className="chart" style={{ minWidth: 280 }}>
        <h3>{title}</h3>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} fontFamily="inherit" fontSize="10">
          <line x1={px} x2={W - px} y1={H - py} y2={H - py} stroke="#E7E5DF" />
          <path d={d} fill="none" stroke={color} strokeWidth="2" />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={xs[i]} cy={y(p[k])} r="3" fill={color} />
              {(i === 0 || i === pts.length - 1 || pts.length <= 4) && <text x={xs[i]} y={y(p[k]) - 8} textAnchor="middle" fill={color} fontWeight="600">{fmt(p[k])}</text>}
              <text x={xs[i]} y={H - 6} textAnchor="middle" fill="#9A9DA6">{p.x}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <Mini title="Entries alive, by week" k="live" color="#5B5E66" fmt={num} top={start * 1.15} />
      <Mini title="Your equity, by week" k="eq" color="#2F8F3E" fmt={money} />
    </div>
  );
}
