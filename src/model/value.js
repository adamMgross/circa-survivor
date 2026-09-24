import { LEGS, OPP, TG_TEAMS, XM_TEAMS } from "../schedule.js";
import { lineFor } from "./lines.js";

// EV_i = w_i / (p_i + sum over other games of p_j w_j), scaled so the field's pick-weighted average = 1.00
// (the scale Atlas / SurvivorGrid use). Games without a Win % are left out of the denominator, which flatters
// everyone else, so the caller gets the coverage and blanks EV when it is too low to trust.
export const EV_MIN_COVERAGE = 0.75;
export function computeEV(legId, rows) {
  const teams = Object.keys(OPP[legId]);
  const gamesTotal = teams.length / 2;
  const covered = teams.filter((t) => rows[t].win != null).length / 2;
  const coverage = gamesTotal ? covered / gamesTotal : 0;
  const out = { ...rows };
  if (coverage < EV_MIN_COVERAGE) {
    for (const t of teams) out[t] = { ...rows[t], raw: null, ev: null };
    return { coverage, covered, gamesTotal, blanked: true, rows: out };
  }
  const S = teams.reduce((a, t) => a + (rows[t].pick || 0) * (rows[t].win || 0), 0);
  const raw = {};
  let wsum = 0, psum = 0;
  for (const t of teams) {
    const r = rows[t]; raw[t] = null; if (r.win == null) continue;
    const opp = OPP[legId][t].opp;
    const own = (r.pick || 0) * r.win, oppc = (rows[opp].pick || 0) * (rows[opp].win || 0);
    const Si = (r.pick || 0) + (S - own - oppc);
    raw[t] = Si > 0 ? r.win / Si : null;
    if (raw[t] != null && r.pick) { wsum += r.pick * raw[t]; psum += r.pick; }
  }
  const mean = psum > 0 ? wsum / psum : 1;
  for (const t of teams) out[t] = { ...rows[t], raw: raw[t], ev: raw[t] == null ? null : raw[t] / mean };
  return { coverage, covered, gamesTotal, blanked: false, rows: out };
}

// Distribution of the number of entries that survive a set of independent games. games: [{ nHome, nAway, pHome }].
// Returns a Float64Array indexed by survivor count.
export function survivorDist(games) {
  const size = games.reduce((a, g) => a + Math.max(g.nHome, g.nAway), 0) + 1;
  let dist = new Float64Array(size), top = 0;
  dist[0] = 1;
  for (const { nHome, nAway, pHome } of games) {
    const next = new Float64Array(size);
    for (let z = 0; z <= top; z++) {
      const m = dist[z]; if (!m) continue;
      next[z + nHome] += m * pHome;
      next[z + nAway] += m * (1 - pHome);
    }
    top += Math.max(nHome, nAway); dist = next;
  }
  return dist;
}
// Our entry's expected share of the surviving field when it joins a cohort of n others on a team that wins with
// probability w: w * E[1 / (n + 1 + Z)], Z distributed as dist.
export function expectedShare(w, n, dist) {
  let e = 0;
  for (let z = 0; z < dist.length; z++) if (dist[z]) e += dist[z] / (n + 1 + z);
  return w * e;
}
// Exact EV for every team in the leg, on computeEV's scale (pick-weighted mean 1.00). counts: entries per team.
// Games without a Win % are left out, as in computeEV, and EV is blanked below the same coverage.
export function computeExactEV(legId, rows, counts) {
  const games = [];
  for (const [t, g] of Object.entries(OPP[legId])) {
    if (!g.home || rows[t].win == null || rows[g.opp].win == null) continue;
    games.push({ home: t, away: g.opp, nHome: counts[t] || 0, nAway: counts[g.opp] || 0, pHome: rows[t].win });
  }
  const gamesTotal = Object.keys(OPP[legId]).length / 2;
  const out = {};
  for (const t of Object.keys(OPP[legId])) out[t] = null;
  if (!gamesTotal || games.length / gamesTotal < EV_MIN_COVERAGE) return out;
  const raw = {};
  for (const g of games) {
    const dist = survivorDist(games.filter((o) => o !== g));
    raw[g.home] = expectedShare(g.pHome, g.nHome, dist);
    raw[g.away] = expectedShare(1 - g.pHome, g.nAway, dist);
  }
  let wsum = 0, psum = 0;
  for (const t of Object.keys(raw)) if (counts[t]) { wsum += counts[t] * raw[t]; psum += counts[t]; }
  const mean = psum > 0 ? wsum / psum : 1;
  for (const t of Object.keys(raw)) out[t] = raw[t] / mean;
  return out;
}

// Future value: expected number of strong-favorite spots the team has left. Each later week counts by how much
// it looks like a strong spot: ~75% projected win counts nearly fully, 65% counts half, 55% a little, 45% nothing.
// Reads as "about N good weeks left" and separates a team with two usable weeks from one with none.
const FV_MID = 0.65, FV_WIDTH = 0.05;
const spotWeight = (win) => 1 / (1 + Math.exp(-(win - FV_MID) / FV_WIDTH));
export function fvFor(legId, team, data) {
  const idx = LEGS.findIndex((l) => l.id === legId);
  let fv = 0;
  for (const l of LEGS.slice(idx + 1)) { const ln = lineFor(l.id, team, data); if (ln && ln.win != null) fv += spotWeight(ln.win); }
  return data?.ratings ? fv : 0;
}

// DILI ("do I love it?"): this week's EV net of what the team is worth to keep.
// Future forfeit: in every later week, how much this team beats a REALISTIC pick (the average of the entry's
// top-3 other available teams that week), weighted by the chance the entry is still alive to use it.
// Expressed as a survival multiplier B ≥ 1. DILI = EV / B^k, where k = style × calendar (early weeks weigh
// the future heavily, the last weeks hardly at all).
export const STYLE = { now: 0.5, balanced: 1, future: 1.35 };
export const SURVIVE = 0.8;                       // typical week-to-week survival of a well-played entry
function calendarWeight(legId) { const i = LEGS.findIndex((l) => l.id === legId); return i <= 5 ? 1.5 : i <= 10 ? 1.0 : i <= 15 ? 0.6 : 0.25; }
function futureForfeit(legId, team, data, burned) {
  const idx = LEGS.findIndex((l) => l.id === legId);
  let logB = 0; const parts = [];
  LEGS.slice(idx + 1).forEach((l, k) => {
    const mine = lineFor(l.id, team, data); if (!mine || mine.win == null) return;
    const others = Object.keys(OPP[l.id]).filter((t) => t !== team && !burned.has(t)).map((t) => lineFor(l.id, t, data)?.win).filter((v) => v != null).sort((a, b) => b - a).slice(0, 3);
    if (others.length < 3) return;
    const bar = others.reduce((a, b) => a + b, 0) / others.length;
    const edge = mine.win - bar; if (edge <= 0) return;
    const s = Math.pow(SURVIVE, k + 1);
    logB += s * Math.log(1 + edge / bar);
    parts.push({ leg: l, edge, bar, win: mine.win, s, contrib: s * Math.log(1 + edge / bar) });
  });
  parts.sort((a, b) => b.contrib - a.contrib);
  return { B: Math.exp(logB), parts };
}
// Holiday scarcity. Thanksgiving has only 10 eligible teams and Christmas only 8, and six are in both
// (BUF, CHI, DEN, GB, LAR, PHI). Burning one on an ordinary week costs flexibility no other pick costs, and an
// entry with none left MUST miss that leg, which is a loss. So this depends only on eligibility, never on how
// good the team looks that day, since a holiday dog is still a body in the pool. Factor per leg still ahead:
// ((n−1)/n)^p, where n = eligible teams this entry still has. Mild at a full pool, sharper as it depletes,
// and 0 at n = 1.
const HOLIDAY_LEGS = [{ id: "TG", teams: TG_TEAMS }, { id: "XM", teams: XM_TEAMS }];
const SCARCITY_P = 0.5;
function holidayScarcity(legId, team, burned, style) {
  const idx = LEGS.findIndex((l) => l.id === legId);
  const p = SCARCITY_P * (STYLE[style] ?? 1);
  let f = 1; const parts = [];
  for (const h of HOLIDAY_LEGS) {
    if (LEGS.findIndex((l) => l.id === h.id) <= idx) continue;   // that leg is this week or already gone
    if (!h.teams.has(team)) continue;                            // team can't play it anyway
    const n = [...h.teams].filter((t) => !burned.has(t)).length; // pool still open to this entry, incl. `team`
    const fh = n <= 1 ? 0 : Math.pow((n - 1) / n, p);
    f *= fh; parts.push({ id: h.id, n, f: fh });
  }
  return { f, parts };
}
export function computeDili(legId, rows, data, burned, style = "future") {
  const k = (STYLE[style] ?? 1) * calendarWeight(legId);
  const out = { ...rows };
  for (const t of Object.keys(OPP[legId])) {
    const r = rows[t];
    if (r.ev == null || burned.has(t)) { out[t] = { ...r, dili: null }; continue; }
    const f = futureForfeit(legId, t, data, burned);
    const h = holidayScarcity(legId, t, burned, style);
    out[t] = { ...r, forfeit: f.B, forfeitParts: f.parts, diliK: k, holiday: h.f, holidayParts: h.parts, dili: (r.ev / Math.pow(f.B, k)) * h.f };
  }
  return { k, rows: out };
}
