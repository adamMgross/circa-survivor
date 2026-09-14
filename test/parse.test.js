// src/CircaSurvivorPlanner.jsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var LEGS = [
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
  { id: "TG", start: "2026-11-25", label: "TG", holiday: true, sub: "Nov 25\u201327", g: "GB@LAR CHI@DET PHI@DAL KC@BUF DEN@PIT" },
  { id: "W12", start: "2026-11-29", label: "12", sub: "Nov 29\u201330", g: "BAL@HOU NO@CIN NYJ@MIA ATL@MIN NYG@IND LV@CLE TEN@JAX WAS@ARI SEA@SF NE@LAC CAR@TB" },
  { id: "W13", start: "2026-12-03", label: "13", g: "KC@LAR DET@ATL LAC@TB WAS@TEN CIN@CLE SF@NYG GB@NO JAX@CHI PHI@ARI MIA@DEN CAR@MIN BUF@NE HOU@PIT DAL@SEA" },
  { id: "W14", start: "2026-12-10", label: "14", g: "MIN@NE DEN@NYJ ATL@CLE CHI@MIA HOU@WAS NO@CAR IND@PHI TB@BAL TEN@DET LAC@LV KC@CIN LAR@SF NYG@SEA BUF@GB PIT@JAX" },
  { id: "W15", start: "2026-12-17", label: "15", g: "SF@LAC SEA@PHI CHI@BUF JAX@HOU BAL@PIT CLE@NYG IND@TEN MIA@GB NO@TB CIN@CAR ATL@WAS NYJ@ARI DAL@LAR DEN@LV DET@MIN NE@KC" },
  { id: "XM", start: "2026-12-24", label: "XM", holiday: true, sub: "Dec 24\u201325", g: "HOU@PHI GB@CHI BUF@DEN LAR@SEA" },
  { id: "W16", start: "2026-12-26", label: "16", sub: "Dec 26\u201328", g: "TB@ATL WAS@MIN CAR@PIT CIN@IND NE@NYJ CLE@BAL LAC@MIA ARI@NO SF@KC JAX@DAL NYG@DET TEN@LV" },
  { id: "W17", start: "2026-12-31", label: "17", g: "BAL@CIN LAR@TB DEN@NE KC@LAC WAS@JAX BUF@MIA PIT@TEN MIN@NYJ NO@ATL SEA@CAR IND@CLE NYG@DAL LV@ARI DET@CHI PHI@SF HOU@GB" },
  { id: "W18", start: "2027-01-09", label: "18", g: "NYJ@BUF JAX@IND LV@KC TEN@HOU LAC@DEN MIA@NE CLE@CIN PIT@BAL CHI@MIN DET@GB DAL@WAS TB@NO PHI@NYG SEA@LAR ATL@CAR SF@ARI" }
];
var DIVISIONS = [
  ["AFC East", ["BUF", "MIA", "NE", "NYJ"]],
  ["AFC North", ["BAL", "CIN", "CLE", "PIT"]],
  ["AFC South", ["HOU", "IND", "JAX", "TEN"]],
  ["AFC West", ["DEN", "KC", "LAC", "LV"]],
  ["NFC East", ["DAL", "NYG", "PHI", "WAS"]],
  ["NFC North", ["CHI", "DET", "GB", "MIN"]],
  ["NFC South", ["ATL", "CAR", "NO", "TB"]],
  ["NFC West", ["ARI", "LAR", "SF", "SEA"]]
];
var ALL_TEAMS = DIVISIONS.flatMap(([, t]) => t).sort();
var OPP = {};
for (const leg of LEGS) {
  OPP[leg.id] = {};
  for (const tok of leg.g.split(" ")) {
    const neutral = tok.endsWith("*");
    const [away, home] = tok.replace("*", "").split("@");
    OPP[leg.id][away] = { opp: home, home: false, neutral };
    OPP[leg.id][home] = { opp: away, home: true, neutral };
  }
}
var TG_TEAMS = new Set(Object.keys(OPP.TG));
var XM_TEAMS = new Set(Object.keys(OPP.XM));
var COLORS = {
  ARI: ["#97233F", "#FFB612"],
  ATL: ["#A71930", "#FFFFFF"],
  BAL: ["#241773", "#9E7C0C"],
  BUF: ["#00338D", "#C60C30"],
  CAR: ["#0085CA", "#101820"],
  CHI: ["#0B162A", "#C83803"],
  CIN: ["#FB4F14", "#000000"],
  CLE: ["#311D00", "#FF3C00"],
  DAL: ["#003594", "#B0B7BC"],
  DEN: ["#FB4F14", "#002244"],
  DET: ["#0076B6", "#B0B7BC"],
  GB: ["#203731", "#FFB612"],
  HOU: ["#03202F", "#A71930"],
  IND: ["#002C5F", "#FFFFFF"],
  JAX: ["#006778", "#D7A22A"],
  KC: ["#E31837", "#FFB81C"],
  LAC: ["#0080C6", "#FFC20E"],
  LV: ["#000000", "#A5ACAF"],
  LAR: ["#003594", "#FFA300"],
  MIA: ["#008E97", "#FC4C02"],
  MIN: ["#4F2683", "#FFC62F"],
  NE: ["#002244", "#B0B7BC"],
  NO: ["#D3BC8D", "#101820"],
  NYG: ["#0B2265", "#FFFFFF"],
  NYJ: ["#125740", "#FFFFFF"],
  PHI: ["#004C54", "#A5ACAF"],
  PIT: ["#FFB612", "#101820"],
  SF: ["#AA0000", "#B3995D"],
  SEA: ["#002244", "#69BE28"],
  TB: ["#D50A0A", "#FFFFFF"],
  TEN: ["#0C2340", "#4B92DB"],
  WAS: ["#5A1414", "#FFB612"]
};
var normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x < 0 ? -y : y;
}
var winFromMargin = (m) => normCdf(m / 13.5);
var ALIAS = { WSH: "WAS", JAC: "JAX", LA: "LAR", LOS: "LAR", STL: "LAR", GNB: "GB", KAN: "KC", NWE: "NE", NOR: "NO", SFO: "SF", TAM: "TB", LVR: "LV", OAK: "LV", SDG: "LAC", SD: "LAC", ARZ: "ARI", BLT: "BAL", CLV: "CLE", HST: "HOU", NYJ: "NYJ", NYG: "NYG" };
var norm = (t) => {
  t = String(t).toUpperCase().trim();
  return COLORS[t] ? t : ALIAS[t] || null;
};
async function askClaude(prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4e3,
      system: "You are a data extraction service. Use at most 3 web searches. Your final reply must be ONLY a single compact JSON object on one line \u2014 no explanation before or after, no markdown fences.",
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!r.ok) throw new Error("API " + r.status + " " + (await r.text()).slice(0, 200));
  const d = await r.json();
  if (d.error) throw new Error("API: " + (d.error.message || JSON.stringify(d.error)).slice(0, 200));
  const txt = (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  window.__lastRaw = { stop: d.stop_reason, types: (d.content || []).map((b) => b.type).join(","), txt };
  if (d.stop_reason === "max_tokens" && !txt.includes("{")) throw new Error("Model ran out of tokens before answering");
  return txt;
}
function extract(txt, key, fallbackWhole) {
  let seg = txt;
  const i = txt.search(new RegExp('"' + key + '"\\s*:'));
  if (i >= 0) {
    seg = txt.slice(i + key.length + 2);
    const nxt = seg.search(/"(?:l|p|r|lines|picks?|ratings|popularity)"\s*:/);
    if (nxt > 0) seg = seg.slice(0, nxt);
  } else if (!fallbackWhole) return {};
  const out = {};
  const add = (t, a, b) => {
    const k = norm(t);
    if (k && !(k in out)) out[k] = [a == null ? null : parseFloat(a), b == null ? null : parseFloat(b)];
  };
  const num = "(-?\\d+(?:\\.\\d+)?)";
  let m, re;
  re = new RegExp('\\[\\s*"([A-Za-z]{2,3})"\\s*,\\s*' + num + "\\s*(?:,\\s*" + num + ")?\\s*\\]", "g");
  while (m = re.exec(seg)) add(m[1], m[2], m[3]);
  re = new RegExp('"([A-Za-z]{2,3})"\\s*:\\s*\\[\\s*' + num + "\\s*(?:,\\s*" + num + ")?\\s*\\]", "g");
  while (m = re.exec(seg)) add(m[1], m[2], m[3]);
  re = new RegExp('"([A-Za-z]{2,3})"\\s*:\\s*\\{[^}]*?"(?:spread|line|sp)"\\s*:\\s*' + num + '[^}]*?"(?:win|w|prob|win_pct|winpct)"\\s*:\\s*' + num, "g");
  while (m = re.exec(seg)) add(m[1], m[2], m[3]);
  re = new RegExp('"([A-Za-z]{2,3})"\\s*:\\s*\\{[^}]*?"(?:win|w|prob|win_pct|winpct)"\\s*:\\s*' + num + '[^}]*?"(?:spread|line|sp)"\\s*:\\s*' + num, "g");
  while (m = re.exec(seg)) add(m[1], m[3], m[2]);
  re = new RegExp('"([A-Za-z]{2,3})"\\s*:\\s*' + num + "(?![\\d.])", "g");
  while (m = re.exec(seg)) add(m[1], m[2], null);
  return out;
}
function toPct(vals, sumCheck) {
  const nums = vals.filter((v) => v != null);
  const frac = nums.length > 0 && nums.every((v) => v <= 1) && (!sumCheck || nums.reduce((a, b) => a + b, 0) <= 1.5);
  return (v) => v == null ? null : frac ? v * 100 : v;
}
async function fetchLeg(leg) {
  const games = leg.g.split(" ").map((t) => t.replace("*", "")).join(" ");
  const legName = leg.id === "TG" ? "Thanksgiving leg (Wed Nov 25 \u2013 Fri Nov 27)" : leg.id === "XM" ? "Christmas leg (Dec 24\u201325)" : `Week ${leg.label}`;
  const teams2 = Object.keys(OPP[leg.id]);
  const prompt = `NFL 2026 ${legName}. Games (away@home): ${games}.
Task 1: current consensus point spread and de-vigged moneyline win probability for every team.
Task 2: projected pick popularity for this leg SPECIFICALLY for the Circa Survivor contest. Search Survivor Atlas, PoolGenius "Circa Survivor", or Circa-specific writeups first. Only if none exist, fall back to a general survivor-pool consensus (Yahoo/ESPN/SurvivorGrid) and say so.
Output format (arrays, not objects, to keep it short):
{"l":[["SEA",-3.5,62],["NE",3.5,38],...],"p":[["LAC",28],["JAX",23],...],"src":"Survivor Atlas"}
"l" = [team, spread from that team's view (negative=favorite), win% as integer]. Include all ${teams2.length} teams: ${teams2.join(",")}.
"p" = [team, pick% as integer] for teams at 1% or more, largest first.
"src" = where the pick % came from: the site name if Circa-specific, "public pool" if general consensus, or "estimate" if you had to guess.`;
  const txt = await askClaude(prompt);
  const lines = {}, pick = {};
  const L = extract(txt, "l", true), P = extract(txt, "p", false);
  const wPct = toPct(Object.values(L).map((x) => x[1]), false), pPct = toPct(Object.values(P).map((x) => x[0]), true);
  for (const t of Object.keys(L)) {
    const [sp, w] = L[t];
    if (OPP[leg.id][t] && sp != null) lines[t] = { spread: sp, win: w == null ? winFromMargin(-sp) : Math.max(0.01, Math.min(0.99, wPct(w) / 100)) };
  }
  for (const t of Object.keys(P)) {
    const [pp] = P[t];
    if (OPP[leg.id][t] && pp != null) pick[t] = pPct(pp) / 100;
  }
  const tot = Object.values(pick).reduce((a, b) => a + b, 0);
  if (tot > 1) for (const t of Object.keys(pick)) pick[t] /= tot;
  for (const t of teams2) if (!lines[t] && lines[OPP[leg.id][t].opp]) {
    const o = lines[OPP[leg.id][t].opp];
    lines[t] = { spread: -o.spread, win: 1 - o.win };
  }
  if (Object.keys(lines).length < 2) {
    const r = window.__lastRaw || {};
    throw new Error(`No usable lines. stop=${r.stop} blocks=${r.types} text=${(r.txt || "").slice(-300)}`);
  }
  const sm = txt.match(/"src"\s*:\s*"([^"]{0,60})"/);
  return { lines, pick, src: sm ? sm[1] : "unknown" };
}
async function fetchRatings() {
  const prompt = `Current NFL 2026 power ratings for all 32 teams as points above/below an average team on a neutral field. Search for a current market-based or model rating (sportsbook power ratings, Inpredictable, Massey, ESPN FPI, etc.).
Reply with ONLY this JSON, one line, no other text: {"r":[["KC",6.5],["CAR",-4],...]} \u2014 one entry per team, numbers between -12 and 12, using exactly these abbreviations: ${ALL_TEAMS.join(",")}.`;
  const txt = await askClaude(prompt);
  const R = extract(txt, "r", true), ratings = {};
  for (const t of Object.keys(R)) if (R[t][0] != null) ratings[t] = R[t][0];
  const n = Object.keys(ratings).length;
  if (n < 20) {
    const r = window.__lastRaw || {};
    throw new Error(`only ${n} teams. stop=${r.stop} text=${(r.txt || "").slice(-200)}`);
  }
  for (const t of ALL_TEAMS) if (ratings[t] == null) ratings[t] = 0;
  return { ratings };
}

// test/parse.test.jsx
var W1 = LEGS[0];
var teams = Object.keys(OPP.W1);
var full = teams.map((t) => `["${t}",${OPP.W1[t].home ? -3 : 3},${OPP.W1[t].home ? 58 : 42}]`).join(",");
var cases = {
  clean: [{ type: "text", text: `{"l":[${full}],"p":[["LAC",28],["JAX",23],["DET",14]]}` }],
  fenced_prose: [{ type: "text", text: 'Here are the lines:\n```json\n{"l":[' + full + '],"p":[["LAC",28]]}\n```\nLet me know!' }],
  split_citations: [
    { type: "server_tool_use", name: "web_search" },
    { type: "web_search_tool_result" },
    { type: "text", text: "Based on my searches: " },
    { type: "text", text: `{"l":[["SEA",-3.` },
    { type: "text", text: `5,62],["NE",3.5,38],["LAR",-6,`, citations: [{}] },
    { type: "text", text: `69],["SF",6,31]],"p":[["LAC",28],["JA` },
    { type: "text", text: `X",23]]}` }
  ],
  object_style: [{ type: "text", text: `{"l":{"SEA":{"spread":-3.5,"win":0.62},"NE":{"win":0.38,"spread":3.5},"LAR":[-6,69]},"p":{"LAC":0.28,"JAX":23}}` }],
  aliases_decimals: [{ type: "text", text: `{"l":[["WSH",3,0.38],["PHI",-3,0.62],["JAC",-8.5,0.77],["LA",-6,0.69]],"p":[["WSH",2],["JAC",23]]}` }],
  truncated: [{ type: "text", text: `{"l":[["SEA",-3.5,62],["NE",3.5,38],["LAR",-6,69],["SF",6,3` }],
  only_favorites: [{ type: "text", text: `{"l":[["SEA",-3.5,62],["LAR",-6,69],["JAX",-8.5,77]],"p":[["JAX",30]]}` }],
  no_win: [{ type: "text", text: `{"l":[["SEA",-3.5],["LAR",-6],["JAX",-8.5]],"p":[]}` }],
  garbage: [{ type: "text", text: "I couldn't find lines for these games." }],
  max_tokens: [{ type: "text", text: "Searching for lines" }]
};
var ratingsTxt = `{"r":[${["ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LV", "LAR", "MIA", "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SF", "SEA", "TB", "TEN", "WSH"].map((t, i) => `["${t}",${i % 9 - 4}]`).join(",")}]}`;
var current;
global.window = { __lastRaw: null };
global.fetch = async () => ({ ok: true, json: async () => ({ content: current, stop_reason: current === cases.max_tokens ? "max_tokens" : "end_turn" }) });
(async () => {
  for (const [name, content] of Object.entries(cases)) {
    current = content;
    try {
      const r2 = await fetchLeg(W1);
      console.log(name.padEnd(16), "OK  lines:", Object.keys(r2.lines).length, "picks:", Object.keys(r2.pick).length, "SEA:", JSON.stringify(r2.lines.SEA), "WAS:", JSON.stringify(r2.lines.WAS));
    } catch (e) {
      console.log(name.padEnd(16), "FAIL", e.message.slice(0, 90));
    }
  }
  current = [{ type: "text", text: ratingsTxt }];
  const r = await fetchRatings();
  console.log("ratings         OK", Object.keys(r.ratings).length, "WAS:", r.ratings.WAS);
})();
