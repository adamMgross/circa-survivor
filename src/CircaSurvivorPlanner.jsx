import { useState, useEffect, useMemo, useRef } from "react";

// ---------- 2026 schedule, grouped into the 20 Circa legs ----------
// "AWAY@HOME"  (* = neutral site). Thanksgiving Eve/Day/Black Friday and
// Christmas Eve/Day games are pulled out into their own legs, per Circa rules.
const LEGS = [
  { id: "W1", start: "2026-09-09", label: "1", g: "NE@SEA SF@LAR* CHI@CAR TB@CIN BAL@IND BUF@HOU NO@DET NYJ@TEN ATL@PIT CLE@JAX ARI@LAC GB@MIN MIA@LV WAS@PHI DAL@NYG DEN@KC" },
  { id: "W2", start: "2026-09-17", label: "2", g: "DET@BUF MIN@CHI PHI@TEN GB@NYJ CAR@ATL NO@BAL CIN@HOU CLE@TB PIT@NE LV@LAC JAX@DEN WAS@DAL SEA@ARI MIA@SF IND@KC NYG@LAR" },
  { id: "W3", start: "2026-09-24", label: "3", g: "ATL@GB KC@MIA HOU@IND TEN@NYG NE@JAX CIN@PIT CAR@CLE NYJ@DET SEA@WAS LAC@BUF MIN@TB ARI@SF BAL@DAL* LV@NO LAR@DEN PHI@CHI" },
  { id: "W4", start: "2026-10-01", label: "4", g: "PIT@CLE IND@WAS* TEN@BAL ARI@NYG JAX@CIN NE@BUF DAL@HOU LAR@PHI GB@TB NYJ@CHI MIA@MIN DEN@SF LAC@SEA KC@LV DET@CAR ATL@NO" },
  { id: "W5", start: "2026-10-08", label: "5", g: "TB@DAL PHI@JAX* LV@NE HOU@TEN CLE@NYJ IND@PIT CIN@MIA MIN@NO NYG@WAS DEN@LAC CHI@GB DET@ARI SF@SEA BAL@ATL BUF@LAR" },
  { id: "W6", start: "2026-10-15", label: "6", g: "SEA@DEN HOU@JAX* NYJ@NE PIT@TB CAR@PHI CHI@ATL TEN@IND NO@NYG BAL@CLE ARI@LAR LAC@KC BUF@LV DAL@GB WAS@SF" },
  { id: "W7", start: "2026-10-22", label: "7", g: "NE@CHI PIT@NO* CLE@TEN MIA@NYJ IND@MIN CIN@BAL NYG@HOU TB@CAR SF@ATL DEN@ARI LAR@LV GB@DET KC@SEA DAL@PHI" },
  { id: "W8", start: "2026-10-29", label: "8", g: "CAR@GB TEN@CIN IND@JAX CLE@PIT BAL@BUF ATL@TB MIN@DET ARI@DAL LV@NYJ LAC@LAR KC@DEN NE@MIA PHI@WAS CHI@SEA" },
  { id: "W9", start: "2026-11-05", label: "9", g: "JAX@BAL CIN@ATL* NYJ@KC CLE@NO DEN@CAR DAL@IND DET@MIA NYG@PHI LAR@WAS LV@SF HOU@LAC ARI@SEA GB@NE TB@CHI BUF@MIN" },
  { id: "W10", start: "2026-11-12", label: "10", g: "WAS@NYG NE@DET* BUF@NYJ MIA@IND KC@ATL MIN@GB JAX@TEN HOU@CLE CAR@NO LAR@ARI SEA@LV SF@DAL PIT@CIN LAC@BAL" },
  { id: "W11", start: "2026-11-19", label: "11", g: "IND@HOU ARI@KC TB@DET JAX@NYG MIA@BUF TEN@DAL BAL@CAR NO@CHI NYJ@LAC PIT@PHI LV@DEN MIN@SF* CIN@WAS" },
  { id: "TG", start: "2026-11-25", label: "TG", holiday: true, sub: "Nov 25–27", g: "GB@LAR CHI@DET PHI@DAL KC@BUF DEN@PIT" },
  { id: "W12", start: "2026-11-29", label: "12", sub: "Nov 29–30", g: "BAL@HOU NO@CIN NYJ@MIA ATL@MIN NYG@IND LV@CLE TEN@JAX WAS@ARI SEA@SF NE@LAC CAR@TB" },
  { id: "W13", start: "2026-12-03", label: "13", g: "KC@LAR DET@ATL LAC@TB WAS@TEN CIN@CLE SF@NYG GB@NO JAX@CHI PHI@ARI MIA@DEN CAR@MIN BUF@NE HOU@PIT DAL@SEA" },
  { id: "W14", start: "2026-12-10", label: "14", g: "MIN@NE DEN@NYJ ATL@CLE CHI@MIA HOU@WAS NO@CAR IND@PHI TB@BAL TEN@DET LAC@LV KC@CIN LAR@SF NYG@SEA BUF@GB PIT@JAX" },
  { id: "W15", start: "2026-12-17", label: "15", g: "SF@LAC SEA@PHI CHI@BUF JAX@HOU BAL@PIT CLE@NYG IND@TEN MIA@GB NO@TB CIN@CAR ATL@WAS NYJ@ARI DAL@LAR DEN@LV DET@MIN NE@KC" },
  { id: "XM", start: "2026-12-24", label: "XM", holiday: true, sub: "Dec 24–25", g: "HOU@PHI GB@CHI BUF@DEN LAR@SEA" },
  { id: "W16", start: "2026-12-26", label: "16", sub: "Dec 26–28", g: "TB@ATL WAS@MIN CAR@PIT CIN@IND NE@NYJ CLE@BAL LAC@MIA ARI@NO SF@KC JAX@DAL NYG@DET TEN@LV" },
  { id: "W17", start: "2026-12-31", label: "17", g: "BAL@CIN LAR@TB DEN@NE KC@LAC WAS@JAX BUF@MIA PIT@TEN MIN@NYJ NO@ATL SEA@CAR IND@CLE NYG@DAL LV@ARI DET@CHI PHI@SF HOU@GB" },
  { id: "W18", start: "2027-01-09", label: "18", g: "NYJ@BUF JAX@IND LV@KC TEN@HOU LAC@DEN MIA@NE CLE@CIN PIT@BAL CHI@MIN DET@GB DAL@WAS TB@NO PHI@NYG SEA@LAR ATL@CAR SF@ARI" },
];

const DIVISIONS = [
  ["AFC East", ["BUF", "MIA", "NE", "NYJ"]],
  ["AFC North", ["BAL", "CIN", "CLE", "PIT"]],
  ["AFC South", ["HOU", "IND", "JAX", "TEN"]],
  ["AFC West", ["DEN", "KC", "LAC", "LV"]],
  ["NFC East", ["DAL", "NYG", "PHI", "WAS"]],
  ["NFC North", ["CHI", "DET", "GB", "MIN"]],
  ["NFC South", ["ATL", "CAR", "NO", "TB"]],
  ["NFC West", ["ARI", "LAR", "SF", "SEA"]],
];
const ALL_TEAMS = DIVISIONS.flatMap(([, t]) => t).sort();
const FULL = { ARI:"Arizona Cardinals", ATL:"Atlanta Falcons", BAL:"Baltimore Ravens", BUF:"Buffalo Bills", CAR:"Carolina Panthers", CHI:"Chicago Bears", CIN:"Cincinnati Bengals", CLE:"Cleveland Browns", DAL:"Dallas Cowboys", DEN:"Denver Broncos", DET:"Detroit Lions", GB:"Green Bay Packers", HOU:"Houston Texans", IND:"Indianapolis Colts", JAX:"Jacksonville Jaguars", KC:"Kansas City Chiefs", LAC:"Los Angeles Chargers", LV:"Las Vegas Raiders", LAR:"Los Angeles Rams", MIA:"Miami Dolphins", MIN:"Minnesota Vikings", NE:"New England Patriots", NO:"New Orleans Saints", NYG:"New York Giants", NYJ:"New York Jets", PHI:"Philadelphia Eagles", PIT:"Pittsburgh Steelers", SF:"San Francisco 49ers", SEA:"Seattle Seahawks", TB:"Tampa Bay Buccaneers", TEN:"Tennessee Titans", WAS:"Washington Commanders" };

// opp[legId][team] = { opp, home, neutral }
const OPP = {};
for (const leg of LEGS) {
  OPP[leg.id] = {};
  for (const tok of leg.g.split(" ")) {
    const neutral = tok.endsWith("*");
    const [away, home] = tok.replace("*", "").split("@");
    OPP[leg.id][away] = { opp: home, home: false, neutral };
    OPP[leg.id][home] = { opp: away, home: true, neutral };
  }
}
const TG_TEAMS = new Set(Object.keys(OPP.TG));
const XM_TEAMS = new Set(Object.keys(OPP.XM));

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



// ---------- Circa actuals (transcribed from Circa's posted selections each week) ----------
const CONTEST = { start: 25017, pool: 25017000, share: 0.05 }; // Jamie owns 5% of each entry
const ACTUALS = {
  W1: {
    asOf: "Sep 14 (MNF pending)",
    picks: { JAX: 8127, LAC: 7585, PIT: 4013, DET: 1771, LV: 1308, PHI: 784, CIN: 351, TEN: 213, SEA: 174, CHI: 128, BAL: 111, NYJ: 89, DAL: 81, MIN: 75, LAR: 49, MIA: 27, NE: 25, KC: 23, SF: 10, HOU: 10, NYG: 10, DEN: 7, IND: 7, TB: 5, CAR: 4, CLE: 4, ARI: 2, GB: 2, BUF: 2, NO: 1, ATL: 1, NOPICK: 18 },
    won: ["SEA", "SF", "PIT", "CHI", "LV", "MIN", "PHI", "ARI", "CIN", "DET", "NYJ", "BAL", "JAX", "BUF", "NYG"],
    lost: ["NE", "LAR", "ATL", "CAR", "MIA", "GB", "WAS", "LAC", "TB", "NO", "TEN", "IND", "CLE", "HOU", "DAL", "NOPICK"],
    pending: ["DEN", "KC"],
  },
};
// derived per-leg field math, in leg order
function fieldTimeline() {
  let live = CONTEST.start;
  const out = [];
  for (const l of LEGS) {
    const a = ACTUALS[l.id]; if (!a) break;
    const lost = Object.entries(a.picks).filter(([t]) => a.lost.includes(t)).reduce((s, [, n]) => s + n, 0);
    const pend = Object.entries(a.picks).filter(([t]) => a.pending.includes(t)).reduce((s, [, n]) => s + n, 0);
    const before = live; live = before - lost;
    out.push({ leg: l, before, lost, pending: pend, after: live, value: CONTEST.pool / live });
  }
  return out;
}

const VERSION = "1.8";
const STORAGE_KEY = "circa-survivor-2026-picks-v2";
const DATA_KEY = "circa-survivor-2026-data-v1";
const BLANK = () => [
  { name: "CIRCAmcised-2", picks: {} },
  { name: "CIRCAmcised-3", picks: {} },
  { name: "CIRCAmcised-4", picks: {} },
];

// ---------- math ----------
const HFA = 2;
const normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x < 0 ? -y : y;
}
const winFromMargin = (m) => normCdf(m / 13.5);
// spread from this team's perspective (negative = favorite), and win prob
function projected(legId, team, ratings) {
  const g = OPP[legId][team];
  if (!g || !ratings || ratings[team] == null || ratings[g.opp] == null) return null;
  const margin = ratings[team] - ratings[g.opp] + (g.neutral ? 0 : g.home ? HFA : -HFA);
  return { spread: -margin, win: winFromMargin(margin), proj: true };
}
// lineFor: any line for display / future-value projection. Live market line if captured, else a projection
// from power ratings (proj: true). NEVER use this for the selected leg's True Win % — use marketLine().
function lineFor(legId, team, data) {
  const live = data?.legs?.[legId]?.lines?.[team];
  if (live) return { ...live, proj: false };
  return projected(legId, team, data?.ratings);
}

// ---------- True Win %: two-sided no-vig moneyline ----------
const impliedProb = (ml) => (ml > 0 ? 100 / (ml + 100) : -ml / (-ml + 100));
const validML = (ml) => Number.isFinite(ml) && Math.abs(ml) >= 100;
function devig(mlA, mlB) {
  if (!validML(mlA) || !validML(mlB)) return null;
  const qA = impliedProb(mlA), qB = impliedProb(mlB);
  return { a: qA / (qA + qB), b: qB / (qA + qB) };
}
// Market-derived line for a team in a leg, or null. A stored line counts as market only if it carries
// both raw moneylines (market: true). Legacy lines (pre-1.8, LLM-reported win %) are accepted ONLY for
// legs that are already locked with Circa actuals, where they serve solely to fit the popularity model.
function marketLine(legId, team, data) {
  const ln = data?.legs?.[legId]?.lines?.[team];
  if (!ln || ln.win == null) return null;
  if (ln.market) return { ...ln, proj: false };
  if (ACTUALS[legId] && ln.legacy !== false) return { ...ln, proj: false, legacy: true };
  return null;
}
function defaultLeg() {
  const now = Date.now();
  for (let i = 0; i < LEGS.length; i++) {
    const nxt = LEGS[i + 1];
    if (!nxt || new Date(nxt.start + "T12:00:00").getTime() > now) return LEGS[i].id;
  }
  return "W18";
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
function availability(legId) {
  const idx = LEGS.findIndex((l) => l.id === legId);
  const tl = fieldTimeline();
  const burned = {};
  for (let k = 0; k < Math.min(idx, tl.length); k++) {
    const r = tl[k], a = ACTUALS[r.leg.id];
    let survive = 1;
    for (let j = k + 1; j < Math.min(idx, tl.length); j++) survive *= tl[j].after / tl[j].before;
    for (const [t, n] of Object.entries(a.picks)) if (a.won.includes(t)) burned[t] = (burned[t] || 0) + n * survive;
  }
  const live = idx < tl.length ? tl[idx].before : (tl.length ? tl[tl.length - 1].after : CONTEST.start);
  const out = {};
  for (const t of ALL_TEAMS) out[t] = Math.max(0, 1 - (burned[t] || 0) / live);
  return out;
}
function modelPick(legId, data, params) {
  const { a, b } = params;
  const av = availability(legId);
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
  const legs = Object.keys(ACTUALS).filter((id) => Object.keys(OPP[id]).some((t) => marketLine(id, t, data)));
  const DEF = { a: 10, b: 1.5, legs: 0 };
  if (!legs.length) return DEF;
  let best = null;
  for (let a = 2; a <= 24; a += 1) for (let b = 0; b <= 4; b += 0.25) {
    let err = 0;
    for (const id of legs) {
      const act = ACTUALS[id], tot = Object.values(act.picks).reduce((x, y) => x + y, 0);
      const m = modelPick(id, data, { a, b });
      for (const t of Object.keys(OPP[id])) err += Math.abs((m[t] || 0) - (act.picks[t] || 0) / tot);
    }
    if (!best || err < best.err) best = { a, b, err, legs: legs.length };
  }
  return best;
}

// track record: mean L1 error of each source vs Circa actuals on legs where both exist
function sourceErrors(data, params) {
  let em = 0, nm = 0, es = 0, ns = 0;
  for (const id of Object.keys(ACTUALS)) {
    const act = ACTUALS[id], tot = Object.values(act.picks).reduce((x, y) => x + y, 0);
    const teams = Object.keys(OPP[id]);
    const m = modelPick(id, data, params), sp = data.legs?.[id]?.pick || {};
    if (Object.keys(m).length) { em += teams.reduce((e, t) => e + Math.abs((m[t] || 0) - (act.picks[t] || 0) / tot), 0); nm++; }
    if (Object.keys(sp).length) { es += teams.reduce((e, t) => e + Math.abs((sp[t] || 0) - (act.picks[t] || 0) / tot), 0); ns++; }
  }
  return { model: nm ? em / nm : null, search: ns ? es / ns : null, n: Math.min(nm, ns) };
}
// weight on the model (rest goes to search)
function modelWeight(errs, circaSrc) {
  if (errs.model != null && errs.search != null && errs.n > 0) {
    const im = 1 / (errs.model + 0.02), is = 1 / (errs.search + 0.02);
    return im / (im + is);
  }
  return circaSrc ? 0.5 : 0.75;
}

// ---------- fetching (Claude API + web search) ----------
const ALIAS = { WSH: "WAS", JAC: "JAX", LA: "LAR", LOS: "LAR", STL: "LAR", GNB: "GB", KAN: "KC", NWE: "NE", NOR: "NO", SFO: "SF", TAM: "TB", LVR: "LV", OAK: "LV", SDG: "LAC", SD: "LAC", ARZ: "ARI", BLT: "BAL", CLV: "CLE", HST: "HOU", NYJ: "NYJ", NYG: "NYG" };
const norm = (t) => { t = String(t).toUpperCase().trim(); return COLORS[t] ? t : ALIAS[t] || null; };

async function askClaude(prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: "You are a data extraction service. Use at most 3 web searches. Your final reply must be ONLY a single compact JSON object on one line — no explanation before or after, no markdown fences.",
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) throw new Error("API " + r.status + " " + (await r.text()).slice(0, 200));
  const d = await r.json();
  if (d.error) throw new Error("API: " + (d.error.message || JSON.stringify(d.error)).slice(0, 200));
  // text with citations arrives split across many text blocks — join with no separator so tokens aren't broken
  const txt = (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  window.__lastRaw = { stop: d.stop_reason, types: (d.content || []).map((b) => b.type).join(","), txt };
  if (d.stop_reason === "max_tokens" && !txt.includes("{")) throw new Error("Model ran out of tokens before answering");
  return txt;
}

// Extract per-team numbers from a (possibly truncated / prose-wrapped) response.
// Accepts: ["SEA",-3.5,62]   "SEA":[-3.5,62]   "SEA":{"spread":-3.5,"win":62}   "SEA":28
function extract(txt, key, fallbackWhole) {
  let seg = txt;
  const i = txt.search(new RegExp('"' + key + '"\\s*:'));
  if (i >= 0) {
    seg = txt.slice(i + key.length + 2);
    const nxt = seg.search(/"(?:l|p|r|lines|picks?|ratings|popularity)"\s*:/);
    if (nxt > 0) seg = seg.slice(0, nxt);
  } else if (!fallbackWhole) return {};
  const out = {};
  const add = (t, a, b) => { const k = norm(t); if (k && !(k in out)) out[k] = [a == null ? null : parseFloat(a), b == null ? null : parseFloat(b)]; };
  const num = "(-?\\d+(?:\\.\\d+)?)";
  let m, re;
  re = new RegExp('\\[\\s*"([A-Za-z]{2,3})"\\s*,\\s*' + num + '\\s*(?:,\\s*' + num + ')?\\s*\\]', "g");
  while ((m = re.exec(seg))) add(m[1], m[2], m[3]);
  re = new RegExp('"([A-Za-z]{2,3})"\\s*:\\s*\\[\\s*' + num + '\\s*(?:,\\s*' + num + ')?\\s*\\]', "g");
  while ((m = re.exec(seg))) add(m[1], m[2], m[3]);
  re = new RegExp('"([A-Za-z]{2,3})"\\s*:\\s*\\{[^}]*?"(?:spread|line|sp)"\\s*:\\s*' + num + '[^}]*?"(?:win|w|prob|win_pct|winpct)"\\s*:\\s*' + num, "g");
  while ((m = re.exec(seg))) add(m[1], m[2], m[3]);
  re = new RegExp('"([A-Za-z]{2,3})"\\s*:\\s*\\{[^}]*?"(?:win|w|prob|win_pct|winpct)"\\s*:\\s*' + num + '[^}]*?"(?:spread|line|sp)"\\s*:\\s*' + num, "g");
  while ((m = re.exec(seg))) add(m[1], m[3], m[2]);
  re = new RegExp('"([A-Za-z]{2,3})"\\s*:\\s*' + num + '(?![\\d.])', "g");
  while ((m = re.exec(seg))) add(m[1], m[2], null);
  return out;
}
// Decide once per set whether values are fractions (0.62) or percents (62): only treat as fractions
// if every value is <= 1 AND they sum to about 1 or less — a lone "1" among percents means 1%, not 100%.
function toPct(vals, sumCheck) {
  const nums = vals.filter((v) => v != null);
  const frac = nums.length > 0 && nums.every((v) => v <= 1) && (!sumCheck || nums.reduce((a, b) => a + b, 0) <= 1.5);
  return (v) => (v == null ? null : frac ? v * 100 : v);
}

// pull [ "AWY", ml, "HOM", ml ] game tuples out of the "ml" section
function extractML(txt) {
  const i = txt.search(/"ml"\s*:/); if (i < 0) return [];
  let seg = txt.slice(i + 5);
  const nxt = seg.search(/"(?:l|p|r|src|book|asof|lines|picks?|ratings)"\s*:/i); if (nxt > 0) seg = seg.slice(0, nxt);
  const out = [];
  const re = /\[\s*"([A-Za-z]{2,3})"\s*,\s*"?([+-]?\d{3,5}|EVEN|EV|PK)"?\s*,\s*"([A-Za-z]{2,3})"\s*,\s*"?([+-]?\d{3,5}|EVEN|EV|PK)"?\s*\]/g;
  const num = (v) => (/^(EVEN|EV|PK)$/i.test(v) ? 100 : parseInt(v, 10));
  let m; while ((m = re.exec(seg))) out.push([norm(m[1]), num(m[2]), norm(m[3]), num(m[4])]);
  return out;
}
async function fetchLeg(leg) {
  const games = leg.g.split(" ").map((t) => t.replace("*", "")).join(" ");
  const legName = leg.id === "TG" ? "Thanksgiving leg (Wed Nov 25 – Fri Nov 27)" : leg.id === "XM" ? "Christmas leg (Dec 24–25)" : `Week ${leg.label}`;
  const teams = Object.keys(OPP[leg.id]);
  const prompt = `NFL 2026 ${legName}. Games (away@home): ${games}.
Task 1 (most important): the current pregame American MONEYLINE for BOTH teams of every game, all taken from ONE sportsbook and one page load (prefer Circa Sports; otherwise DraftKings or FanDuel). Report the raw numbers exactly as shown (e.g. -175 and +150). Do not compute probabilities. If a game has no two-sided moneyline posted, omit that game rather than estimating.
Task 2: the point spread for each game from the same book (display only).
Task 3: projected pick popularity for this leg SPECIFICALLY for the Circa Survivor contest. Search Survivor Atlas, PoolGenius "Circa Survivor", or Circa-specific writeups first. Only if none exist, fall back to a general survivor-pool consensus (Yahoo/ESPN/SurvivorGrid) and say so.
Output format (arrays, not objects, to keep it short):
{"ml":[["NE",150,"SEA",-175],...],"l":[["SEA",-3.5],["NE",3.5],...],"p":[["LAC",28],["JAX",23],...],"book":"DraftKings","asof":"Sep 14 2026 1:55 PM ET","src":"Survivor Atlas"}
"ml" = [away, awayML, home, homeML] for every game with both sides posted.
"l" = [team, spread from that team's view (negative=favorite)] for all ${teams.length} teams: ${teams.join(",")}.
"p" = [team, pick% as integer] for teams at 1% or more, largest first.
"book" = the sportsbook the moneylines came from. "asof" = when those odds were displayed.
"src" = where the pick % came from: the site name if Circa-specific, "public pool" if general consensus, or "estimate" if you had to guess.`;
  const txt = await askClaude(prompt);
  const lines = {}, pick = {};
  // --- True Win %: deterministic, from raw two-sided moneylines only ---
  let games_ok = 0;
  for (const [a, mlA, h, mlH] of extractML(txt)) {
    if (!a || !h || !OPP[leg.id][a] || OPP[leg.id][a].opp !== h) continue;
    const d = devig(mlA, mlH); if (!d) continue;
    lines[a] = { win: d.a, ml: mlA, oppMl: mlH, market: true };
    lines[h] = { win: d.b, ml: mlH, oppMl: mlA, market: true };
    games_ok++;
  }
  // --- spreads: display only; never turned into a probability for this leg ---
  const L = extract(txt, "l", true);
  for (const t of Object.keys(L)) { const [sp] = L[t]; if (OPP[leg.id][t] && sp != null) lines[t] = { ...(lines[t] || { win: null, market: false }), spread: sp }; }
  // --- pick popularity (LLM/search estimate; separate from Win %) ---
  const P = extract(txt, "p", false);
  const pPct = toPct(Object.values(P).map((x) => x[0]), true);
  for (const t of Object.keys(P)) { const [pp] = P[t]; if (OPP[leg.id][t] && pp != null) pick[t] = pPct(pp) / 100; }
  const tot = Object.values(pick).reduce((x, y) => x + y, 0);
  if (tot > 1) for (const t of Object.keys(pick)) pick[t] /= tot;
  if (games_ok === 0) { const r = window.__lastRaw || {}; throw new Error(`No two-sided moneylines found. stop=${r.stop} text=${(r.txt || "").slice(-300)}`); }
  const bm = txt.match(/"book"\s*:\s*"([^"]{0,60})"/), am = txt.match(/"asof"\s*:\s*"([^"]{0,60})"/), sm = txt.match(/"src"\s*:\s*"([^"]{0,60})"/);
  return { lines, pick, src: sm ? sm[1] : "unknown", book: bm ? bm[1] : "unknown", asof: am ? am[1] : "", games: games_ok, gamesTotal: leg.g.split(" ").length };
}
async function fetchRatings() {
  const prompt = `Current NFL 2026 power ratings for all 32 teams as points above/below an average team on a neutral field. Search for a current market-based or model rating (sportsbook power ratings, Inpredictable, Massey, ESPN FPI, etc.).
Reply with ONLY this JSON, one line, no other text: {"r":[["KC",6.5],["CAR",-4],...]} — one entry per team, numbers between -12 and 12, using exactly these abbreviations: ${ALL_TEAMS.join(",")}.`;
  const txt = await askClaude(prompt);
  const R = extract(txt, "r", true), ratings = {};
  for (const t of Object.keys(R)) if (R[t][0] != null) ratings[t] = R[t][0];
  const n = Object.keys(ratings).length;
  if (n < 20) { const r = window.__lastRaw || {}; throw new Error(`only ${n} teams. stop=${r.stop} text=${(r.txt || "").slice(-200)}`); }
  for (const t of ALL_TEAMS) if (ratings[t] == null) ratings[t] = 0;
  return { ratings };
}
export { extract, fetchLeg, fetchRatings, OPP, LEGS };

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
.csp .ctl { display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-size:13px; }
.csp .ctl select { font-size:13px; padding:5px 8px; border:1px solid #d9d6cf; border-radius:6px; background:#fff; }
.csp .btn { font-size:13px; padding:6px 12px; border:1px solid #1a1a1a; background:#1a1a1a; color:#fff; border-radius:6px; cursor:pointer; }
.csp .btn:disabled { opacity:.5; cursor:default; }
.csp .stamp { font-size:11px; color:#6f6c66; }

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
.csp td.c:not(.bye):not(.dead):hover { box-shadow: inset 0 0 0 2px #1a1a1a; }
.csp td.c .oth { position:absolute; top:1px; right:3px; font-size:9px; color:#8a5a00; letter-spacing:1px; }
.csp td.c.pick .oth { color:#6b8a2b; }

.csp td.fv { width:70px; min-width:70px; height:30px; padding:0 6px; }
.csp td.fv .fvbar { height:8px; background:#e9e8e3; border-radius:2px; overflow:hidden; }
.csp td.fv .fvbar i { display:block; height:100%; background:#2e7a33; }
.csp td.fv .n { font-size:10px; color:#6f6c66; margin-left:4px; }
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
.csp .audit { background:#fff; border-top:1px solid #e4e2dc; border-bottom:1px solid #e4e2dc; padding:10px 12px; max-height:46vh; overflow:auto; }
.csp .audit .f { font-size:12px; color:#3a3833; margin-bottom:8px; line-height:1.5; }
.csp .audit .f code { background:#f3f2ee; padding:1px 5px; border-radius:3px; }
.csp .audit table { border-collapse:collapse; font-size:12px; }
.csp .audit th { position:static; height:auto; padding:4px 10px; background:#f3f2ee; color:#3a3833; font-size:11px; text-align:right; border:none; border-bottom:1px solid #e4e2dc; cursor:default; }
.csp .audit td { padding:0 10px; height:24px; text-align:right; border:none; border-bottom:1px solid #f0efeb; color:#3a3833; }
.csp .audit th:first-child, .csp .audit td:first-child { text-align:left; font-weight:700; color:#1a1a1a; }
.csp .audit td.fin { font-weight:700; color:#1a1a1a; }
.csp .audit td.mut { color:#9a978f; }
.csp .legend { background:#f3f2ee; display:flex; gap:16px; flex-wrap:wrap; padding:10px 12px; font-size:12px; color:#6f6c66; }
.csp .legend span b { display:inline-block; width:10px; height:10px; margin-right:5px; vertical-align:-1px; border-radius:2px; }
`;

export default function CircaSurvivorPlanner() {
  const [entries, setEntries] = useState(BLANK());
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [data, setData] = useState({ legs: {}, ratings: null, updatedAt: null });
  const [legId, setLegId] = useState(defaultLeg());
  const [sort, setSort] = useState({ key: "ev", dir: 1 }); // key: ev|wp|pp|team|fv|<legId>
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("planner");
  const [audit, setAudit] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r && r.value) { const v = JSON.parse(r.value); if (Array.isArray(v) && v.length === 3) setEntries(v); }
      } catch (e) {}
      try {
        const r = await window.storage.get(DATA_KEY);
        if (r && r.value) {
          const d = JSON.parse(r.value);
          for (const lg of Object.values(d.legs || {})) {
            const tot = Object.values(lg.pick || {}).reduce((a, b) => a + b, 0);
            if (tot > 1.05) for (const t of Object.keys(lg.pick)) lg.pick[t] = lg.pick[t] >= 1 ? 0.01 : lg.pick[t];
          }
          setData(d);
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (firstRun.current) { firstRun.current = false; return; }
    (async () => {
      try { await window.storage.set(STORAGE_KEY, JSON.stringify(entries)); setStatus("Saved"); }
      catch (e) { setStatus("Couldn't save — picks live only in this session"); }
    })();
  }, [entries, loaded]);

  const exportState = async () => {
    const blob = JSON.stringify({ version: VERSION, exportedAt: new Date().toISOString(), entries, data }, null, 2);
    try { await navigator.clipboard.writeText(blob); setStatus("Copied full state to clipboard"); }
    catch (e) { window.prompt("Copy this:", blob); }
  };
  const importState = async () => {
    const txt = window.prompt("Paste an exported state JSON:");
    if (!txt) return;
    try {
      const v = JSON.parse(txt);
      if (!Array.isArray(v.entries) || !v.data) throw new Error("not a planner export");
      setEntries(v.entries); setData(v.data);
      try { await window.storage.set(DATA_KEY, JSON.stringify(v.data)); } catch (e) {}
      setStatus("Imported");
    } catch (e) { setStatus("Import failed: " + e.message); }
  };

  const refresh = async () => {
    setBusy(true);
    const leg = LEGS.find((l) => l.id === legId);
    try {
      setStatus(`Pulling ${leg.id} lines + pick %…`);
      const legData = await fetchLeg(leg);
      let ratings = data.ratings, ratingsErr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        setStatus(attempt ? "Pulling power ratings (retry)…" : "Pulling power ratings…");
        try { const r = await fetchRatings(); if (r.ratings) { ratings = r.ratings; ratingsErr = null; break; } }
        catch (e) { ratingsErr = e.message; }
      }
      const next = { legs: { ...data.legs, [legId]: { lines: legData.lines || {}, pick: legData.pick || {}, src: legData.src, book: legData.book, asof: legData.asof, games: legData.games, gamesTotal: legData.gamesTotal, at: Date.now() } }, ratings, ratingsAt: ratingsErr ? data.ratingsAt : Date.now(), updatedAt: Date.now() };
      setData(next);
      try { await window.storage.set(DATA_KEY, JSON.stringify(next)); } catch (e) {}
      const miss = legData.gamesTotal - legData.games;
      setStatus((miss ? `Moneylines for ${legData.games}/${legData.gamesTotal} games (${miss} missing → Win % unavailable)` : "Data updated") + (ratingsErr ? "; ratings failed: " + ratingsErr : ""));
    } catch (e) {
      setStatus("Refresh failed: " + e.message);
    }
    setBusy(false);
  };

  const entry = entries[active];
  const usedBy = useMemo(() => { const m = {}; for (const [leg, team] of Object.entries(entry.picks)) m[team] = leg; return m; }, [entry]);

  const params = useMemo(() => fitParams(data), [data]);
  const errs = useMemo(() => sourceErrors(data, params), [data, params]);
  // per-team stats for selected leg
  const stats = useMemo(() => {
    const act = ACTUALS[legId];
    const actTot = act ? Object.values(act.picks).reduce((a, b) => a + b, 0) : 0;
    const searchP = data.legs?.[legId]?.pick || {};
    const src = data.legs?.[legId]?.src || "";
    const circaSrc = /atlas|poolgenius|circa/i.test(src);
    const modelP = modelPick(legId, data, params);
    const hasSearch = Object.keys(searchP).length > 0, hasModel = Object.keys(modelP).length > 0;
    let pick, wm = null;
    if (act) pick = Object.fromEntries(Object.entries(act.picks).map(([t, n]) => [t, n / actTot]));
    else if (!hasSearch) pick = modelP;
    else if (!hasModel) pick = searchP;
    else { wm = modelWeight(errs, circaSrc); pick = {}; for (const t of Object.keys(OPP[legId])) { const v = wm * (modelP[t] || 0) + (1 - wm) * (searchP[t] || 0); if (v > 0) pick[t] = v; } }
    const rows = {};
    for (const t of ALL_TEAMS) {
      const mk = marketLine(legId, t, data);          // True Win % (market only) — null if no valid two-sided ML
      const disp = lineFor(legId, t, data);           // spread for display; may be a projection
      rows[t] = { win: mk ? mk.win : null, ml: mk ? mk.ml : null, oppMl: mk ? mk.oppMl : null, legacy: !!(mk && mk.legacy),
        pick: (act || hasModel || hasSearch) ? (pick[t] ?? (disp ? 0 : null)) : null, spread: disp ? disp.spread : null, proj: disp ? disp.proj : false, pm: modelP[t], ps: searchP[t], src, wm, act: !!act };
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
    // future value: strong-favorite spots in remaining legs after this one
    const idx = LEGS.findIndex((l) => l.id === legId);
    for (const t of ALL_TEAMS) rows[t].fv = data.ratings ? fvFor(legId, t, data) : null;
    return rows;
  }, [data, legId, params, errs]);
  const maxFv = Math.max(0.01, ...ALL_TEAMS.map((t) => stats[t].fv || 0));
  const topEv = Math.max(...ALL_TEAMS.map((t) => stats[t].ev || 0));

  const sortedTeams = useMemo(() => {
    const k = sort.key, d = sort.dir;
    const val = (t) => {
      if (k === "team") return t;
      if (k === "ev" || k === "wp" || k === "pp" || k === "fv") { const v = { ev: stats[t].ev, wp: stats[t].win, pp: stats[t].pick, fv: stats[t].fv }[k]; return v == null ? -Infinity : v; }
      const ln = lineFor(k, t, data); return ln ? -ln.spread : -Infinity; // favorites first
    };
    return [...ALL_TEAMS].sort((a, b) => { const va = val(a), vb = val(b); if (va === vb) return a < b ? -1 : 1; return (va < vb ? 1 : -1) * d; });
  }, [sort, stats, data]);

  const clickSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === "team" ? -1 : 1 }));
  const setPick = (lg, team) => setEntries((prev) => prev.map((e, i) => { if (i !== active) return e; const picks = { ...e.picks }; if (picks[lg] === team) delete picks[lg]; else picks[lg] = team; return { ...e, picks }; }));
  const legLabel = (l) => (l.id === "TG" ? "Thanksgiving" : l.id === "XM" ? "Christmas" : `Week ${l.label}`);
  const fmtSp = (v) => (v == null ? "" : v > 0 ? "+" + v : v === 0 ? "PK" : String(v));
  const pct = (v) => (v == null ? "–" : Math.round(v * 100) + "%");
  const cur = LEGS.find((l) => l.id === legId);
  const stamp = data.legs?.[legId]?.at ? new Date(data.legs[legId].at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;

  const Header = () => (
    <>
      <th className={"L ev" + (sort.key === "ev" ? " sorted" : "")} onClick={() => clickSort("ev")} title={`EV for ${legLabel(cur)}`}>EV</th>
      <th className={"L wp" + (sort.key === "wp" ? " sorted" : "")} onClick={() => clickSort("wp")} title={`True Win % — two-sided no-vig moneyline${data.legs?.[legId]?.book ? ` · ${data.legs[legId].book}${data.legs[legId].asof ? " · " + data.legs[legId].asof : ""}` : ""}`}>W%</th>
      <th className={"L pp" + (sort.key === "pp" ? " sorted" : "")} onClick={() => clickSort("pp")} title="Projected Circa pick popularity">P%</th>
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
    <div className="csp">
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
            <span className="status">{loaded ? status : "Loading…"}</span>
          </div>}
        </div>
        {view === "planner" && <div className="ctl">
          <select value={legId} onChange={(e) => setLegId(e.target.value)}>
            {LEGS.map((l) => <option key={l.id} value={l.id}>{legLabel(l)}</option>)}
          </select>
          <button className="btn" onClick={refresh} disabled={busy || !loaded}>{busy ? "Refreshing…" : "Refresh lines & pick %"}</button>
          <button className="ghost" onClick={exportState} title="Copy picks + all pulled data as JSON">Export</button>
          <button className="ghost" onClick={importState} title="Paste a previously exported JSON">Import</button>
          <button className={"ghost" + (audit ? " on" : "")} onClick={() => setAudit((a) => !a)} title="Show how P% was built">
            {ACTUALS[legId] ? "P% = Circa actuals" : data.legs?.[legId]?.pick && Object.keys(data.legs[legId].pick).length ? `P% = model ${Math.round(100 * modelWeight(errs, /atlas|poolgenius|circa/i.test(data.legs[legId].src || "")))}% + search ${100 - Math.round(100 * modelWeight(errs, /atlas|poolgenius|circa/i.test(data.legs[legId].src || "")))}%` : "P% = field model"} {audit ? "▴" : "▾"}
          </button>
        </div>}
      </div>

      {view === "actuals" && <Actuals entries={entries} data={data} params={params} />}
      {view === "planner" && audit && <AuditPanel legId={legId} data={data} params={params} errs={errs} stats={stats} />}
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
                  <td className={"L wp num" + (st.win == null ? " blank" : "")} title={inLeg ? (st.win == null ? "No valid two-sided moneyline captured — refresh, or unavailable" : st.legacy ? "Legacy value (pre-market capture); used only to fit the popularity model" : `ML ${fmtSp(st.ml)} vs ${fmtSp(st.oppMl)} → ${pct(st.win)} no-vig`) : ""}>{inLeg ? pct(st.win) : ""}</td>
                  <td className={"L pp num" + (st.pick == null ? " blank" : "")} title={inLeg ? `model ${pct(st.pm)} · search ${pct(st.ps)}${st.src ? " (" + st.src + ")" : ""}` : ""}>{inLeg ? (st.pick == null ? "–" : st.pick < 0.005 ? "<1%" : Math.round(st.pick * 100) + "%") : ""}</td>
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
                    const fav = ln && ln.spread < 0 && !dead ? Math.min(1, -ln.spread / 14) : 0;
                    const tip = !g ? `${team} bye` : dead ? `${team} already used (${legLabel(LEGS.find((x) => x.id === usedLeg))})`
                      : `${legLabel(l)}: ${team} ${g.home || g.neutral ? "vs" : "at"} ${g.opp}${g.neutral ? " (neutral)" : ""}${ln ? ` · ${fmtSp(ln.spread)}${ln.market ? ` · ML ${fmtSp(ln.ml)} / ${fmtSp(ln.oppMl)} · True Win ${pct(ln.win)} (${data.legs[l.id]?.book || "market"})` : ln.proj ? ` · projected ${pct(ln.win)} (ratings, not market)` : ln.win == null ? " · Win % unavailable (no two-sided moneyline)" : ""}` : ""}`;
                    return (
                      <td key={l.id} className={cls} title={tip} onClick={() => g && !dead && setPick(l.id, team)}>
                        {fav > 0 && <span className="fb" style={{ background: `rgba(46,122,51,${0.15 + 0.85 * fav})` }} />}
                        {label}
                        {ln && <span className={"sp" + (ln.proj ? " proj" : "")}>{ln.spread != null ? fmtSp(ln.spread) : ln.market ? "ML " + fmtSp(ln.ml) : ""}</span>}
                        {others && <span className="oth">{others}</span>}
                      </td>
                    );
                  })}
                  <td className="fv" title={st.fv == null ? "Refresh to load ratings" : `${st.fv.toFixed(2)} — sum of win prob above 60% in remaining legs`}>
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
function AuditPanel({ legId, data, params, errs, stats }) {
  const act = ACTUALS[legId];
  const leg = data.legs?.[legId] || {};
  const searchP = leg.pick || {}, src = leg.src || "none";
  const circaSrc = /atlas|poolgenius|circa/i.test(src);
  const hasSearch = Object.keys(searchP).length > 0;
  const av = availability(legId);
  const wm = act ? null : hasSearch ? modelWeight(errs, circaSrc) : 1;
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
          <b>Field model</b>: <code>win^{params.a} × e^(−{params.b} × future value) × availability</code>, normalized across teams favored this leg. Teams under 50% get 0. Fit on {params.legs} leg(s) of Circa actuals{errs.n ? <> — average miss so far: model {pc(errs.model)}, search {pc(errs.search)}</> : null}.
          <br /><b>Search</b>: {hasSearch ? <>source reported as <code>{src}</code>{circaSrc ? " (Circa-specific)" : " (not Circa-specific)"}</> : "no numbers returned for this leg"}.
          <br /><b>Final P%</b> = {hasSearch ? <>{pc(wm)} model + {pc(1 - wm)} search</> : "model only"}.
        </>}
        <br /><b>True Win %</b>: {leg.book ? <>two-sided no-vig moneylines from <code>{leg.book}</code>{leg.asof ? <> as of {leg.asof}</> : null}, captured {leg.at ? new Date(leg.at).toLocaleString() : ""} — {leg.games}/{leg.gamesTotal} games</> : teams.some((t) => stats[t].legacy) ? "legacy LLM-reported values (before v1.8); this leg is locked, so they only feed the model fit" : "not captured yet — refresh this leg"}. Spreads and future weeks are display/projection only and never feed Win %.
      </div>
      <table>
        <thead><tr><th>Team</th><th>ML</th><th>Win</th><th>Future value</th><th>Field holding</th><th>Model raw</th><th>Model %</th><th>Search %</th><th>Final</th></tr></thead>
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
              <td className={searchP[t] == null ? "mut" : ""}>{searchP[t] == null ? "–" : pc(searchP[t], 1)}</td>
              <td className="fin">{pc(stats[t].pick, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Actuals tab ----------
function Actuals({ entries, data, params }) {
  const tl = fieldTimeline();
  const last = tl[tl.length - 1];
  const [selLeg, setSelLeg] = useState(last ? last.leg.id : null);
  const legName = (l) => (l.id === "TG" ? "Thanksgiving" : l.id === "XM" ? "Christmas" : "Week " + l.label);
  // Jamie's entries: alive unless a completed leg's pick lost (or no pick was made for a completed leg)
  const alive = entries.map((e) => tl.every((r) => { const t = e.picks[r.leg.id]; return t && !ACTUALS[r.leg.id].lost.includes(t); }));
  const nAlive = alive.filter(Boolean).length;
  const equityNow = last ? nAlive * CONTEST.share * last.value : entries.length * CONTEST.share * (CONTEST.pool / CONTEST.start);
  const equity0 = entries.length * CONTEST.share * (CONTEST.pool / CONTEST.start);
  const money = (v) => "$" + Math.round(v).toLocaleString();
  const num = (v) => v.toLocaleString();
  const pctOf = (n, d) => (100 * n / d).toFixed(n / d < 0.01 ? 2 : 1) + "%";
  const name = (t) => (t === "NOPICK" ? "No pick" : t);

  // series for chart: live entries per leg + equity
  const pts = [{ x: "Start", live: CONTEST.start, eq: equity0 }, ...tl.map((r, i) => ({ x: r.leg.label, live: r.after, eq: entries.reduce((s, e, j) => s + (tl.slice(0, i + 1).every((q) => e.picks[q.leg.id] && !ACTUALS[q.leg.id].lost.includes(e.picks[q.leg.id])) ? 1 : 0), 0) * CONTEST.share * r.value }))];

  return (
    <div className="act">
      <div className="cards">
        <div className="card"><div className="k">Starting entries</div><div className="v">{num(CONTEST.start)}</div><div className="d">{money(CONTEST.pool)} pool</div></div>
        <div className="card"><div className="k">Live entries</div><div className="v">{num(last ? last.after : CONTEST.start)}</div><div className="d">{last ? `${pctOf(CONTEST.start - last.after, CONTEST.start)} eliminated${last.pending ? ` · ${num(last.pending)} pending` : ""}` : ""}</div></div>
        <div className="card"><div className="k">Implied value / entry</div><div className="v">{money(last ? last.value : CONTEST.pool / CONTEST.start)}</div><div className="d">pool ÷ live entries</div></div>
        <div className="card"><div className="k">Your equity</div><div className={"v" + (equityNow > equity0 ? " up" : "")}>{money(equityNow)}</div><div className="d">{nAlive}/{entries.length} entries alive · 5% each · started {money(equity0)}</div></div>
      </div>

      {pts.length > 1 && <Chart pts={pts} money={money} num={num} />}

      {tl.filter((r) => r.leg.id === selLeg).map((r) => {
        const a = ACTUALS[r.leg.id];
        const tot = Object.values(a.picks).reduce((x, y) => x + y, 0);
        const rows = Object.entries(a.picks).sort((x, y) => y[1] - x[1]);
        const max = rows[0][1];
        const st = (t) => (a.lost.includes(t) ? "L" : a.pending.includes(t) ? "P" : a.won.includes(t) ? "W" : "");
        const mp = modelPick(r.leg.id, data, params), sp = data.legs?.[r.leg.id]?.pick || {}, ssrc = data.legs?.[r.leg.id]?.src;
        const hasM = Object.keys(mp).length > 0, hasS = Object.keys(sp).length > 0;
        const fp = (v) => (v == null ? "" : v < 0.005 ? "<1%" : (100 * v).toFixed(v < 0.1 ? 1 : 0) + "%");
        return (
          <div className="legcard" key={r.leg.id}>
            <div className="hd2">
              <select className="legsel" value={selLeg} onChange={(e) => setSelLeg(e.target.value)}>
                {tl.map((q) => <option key={q.leg.id} value={q.leg.id}>{legName(q.leg)}</option>)}
              </select>
              <span className="m"><b>{num(r.before)}</b> in → <b>{num(r.lost)}</b> out ({pctOf(r.lost, r.before)}){r.pending ? <> → <b>{num(r.pending)}</b> pending</> : null} → <b>{num(r.after)}</b> live · {a.asOf}</span>
            </div>
            <table className="dist">
              <thead><tr><th>Team</th><th>Entries</th><th>% of field</th><th style={{ textAlign: "left" }}></th>{hasM && <th title={`win^${params.a} · e^(−${params.b}·FV) · availability`}>Model est.</th>}{hasS && <th title={ssrc}>Search est.</th>}<th>Result</th><th>Eliminated</th></tr></thead>
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
                      {hasS && <td style={{ color: "#6f6c66" }}>{fp(sp[t])}</td>}
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
    </div>
  );
}

function Chart({ pts, money, num }) {
  const Mini = ({ title, k, color, fmt, top }) => {
    const W = 360, H = 140, px = 30, py = 22;
    const xs = pts.map((_, i) => px + (i * (W - 2 * px)) / Math.max(1, pts.length - 1));
    const mx = top || Math.max(...pts.map((p) => p[k])) * 1.2;
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
      <Mini title="Live entries by leg" k="live" color="#6f6c66" fmt={num} top={CONTEST.start * 1.15} />
      <Mini title="Your equity by leg" k="eq" color="#2e7a33" fmt={money} />
    </div>
  );
}