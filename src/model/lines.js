import { LEGS, OPP, ABBR, legForGame } from "../schedule.js";
import { HFA } from "../ratings.js";

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

const impliedProb = (ml) => (ml > 0 ? 100 / (ml + 100) : -ml / (-ml + 100));
const validML = (ml) => Number.isFinite(ml) && Math.abs(ml) >= 100;
export function devig(mlA, mlB) {
  if (!validML(mlA) || !validML(mlB)) return null;
  const qA = impliedProb(mlA), qB = impliedProb(mlB);
  return { a: qA / (qA + qB), b: qB / (qA + qB) };
}
// Each book is de-vigged on its own two prices, and the consensus is the MEDIAN of the books' home-win
// probabilities, and the away side is its complement (medians of the two sides need not sum to 1).
const STALE_MS = 48 * 3600 * 1000;   // a book whose quote is this much older than the freshest book's is left out
export const BOOK_NAME = { pinnacle: "Pinnacle", betmgm: "BetMGM", draftkings: "DraftKings", fanduel: "FanDuel", williamhill_us: "Caesars", nflverse: "closing line (nflverse)" };
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const roundHalf = (v) => Math.round(v * 2) / 2;
// status by number of contributing books
const STATUS = { 0: "none", 1: "single", 2: "degraded" };
const statusFor = (n, closing) => (closing ? "closing" : STATUS[n] || "consensus");
export const STATUS_TEXT = { consensus: "consensus of 3+ books", degraded: "2 books only (degraded)", single: "single book (provisional)", closing: "closing line from nflverse (game already played)", none: "no valid two-sided moneyline" };

// One game's books → per-book de-vigged probabilities with exclusion reasons, plus the consensus.
export function consensusForGame(key, g) {
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
export function linesFromOdds(legOdds) {
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

// Everything the model needs, assembled from the four data files. `prev` is the same view built from the quotes
// and ratings of the refresh before the latest one (games without a stored previous quote reuse the current one).
export function buildData({ picks, actuals, odds, ratings }, withPrev = true) {
  const legs = {};
  for (const l of LEGS) {
    const r = linesFromOdds(odds?.legs?.[l.id]);
    if (r.games) legs[l.id] = { ...r, gamesTotal: Object.keys(OPP[l.id]).length / 2, books: odds.books || [] };
  }
  const data = {
    entries: Array.isArray(picks?.entries) ? picks.entries : [],
    legs, ratings: ratings?.ratings || null, ratingsAt: ratings?.updatedAt || null, ratingsSrc: ratings?.source || "", oddsAt: odds?.updatedAt || null,
    actuals: actuals?.legs || {}, contest: actuals?.contest || { start: 0, pool: 0, share: 0 }, prev: null,
  };
  if (withPrev && odds?.legs) {
    let any = false; const pl = {};
    for (const [id, leg] of Object.entries(odds.legs)) {
      const games = {};
      for (const [k, g] of Object.entries(leg.games || {})) { if (g.prev?.books) { any = true; games[k] = { ...g, books: g.prev.books }; } else games[k] = g; }
      pl[id] = { ...leg, games };
    }
    if (any) data.prev = buildData({ picks, actuals, odds: { ...odds, legs: pl, updatedAt: odds.prevUpdatedAt || null }, ratings: ratings?.prev?.ratings ? { ...ratings, ...ratings.prev, prev: null } : ratings }, false);
  }
  return data;
}
// lineFor: any line for display / future-value projection. Live market line if captured, else a projection
// from power ratings (proj: true). NEVER use this for the selected leg's True Win %, use marketLine().
export function lineFor(legId, team, data) {
  const live = data?.legs?.[legId]?.lines?.[team];
  if (live) return { ...live, proj: false };
  return projected(legId, team, data?.ratings);
}
export function marketLine(legId, team, data) {
  const ln = data?.legs?.[legId]?.lines?.[team];
  return ln && ln.market && ln.win != null ? { ...ln, proj: false } : null;
}

// One game of The Odds API's /odds response -> { legId, key, kickoff, books } in the data/odds.json shape, keeping only
// books with both moneylines from the same market. null when the teams or the game are not on the Circa schedule.
export function oddsGameFromApi(g) {
  const away = ABBR[g.away_team], home = ABBR[g.home_team];
  const legId = away && home ? legForGame(away, home) : null;
  if (!legId) return null;
  const books = {};
  for (const bk of g.bookmakers) {
    const h2h = bk.markets.find((m) => m.key === "h2h"), sp = bk.markets.find((m) => m.key === "spreads");
    if (!h2h) continue;
    const ml = {}, spread = {};
    for (const o of h2h.outcomes) { const t = ABBR[o.name]; if (t) ml[t] = o.price; }
    for (const o of sp?.outcomes || []) { const t = ABBR[o.name]; if (t && o.point != null) spread[t] = o.point; }
    if (ml[away] == null || ml[home] == null) continue;
    books[bk.key] = { asof: h2h.last_update, ml, spread };
  }
  return { legId, key: `${away}@${home}`, kickoff: g.commence_time, books };
}
