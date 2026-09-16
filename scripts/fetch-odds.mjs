// Pull two-sided moneylines + spreads for upcoming NFL games from several sportsbooks via The Odds API
// and merge them into data/odds.json, keyed by Circa leg and "AWAY@HOME". Raw per-book prices are stored;
// the app de-vigs each book and takes the median. A game is only overwritten while it has not kicked off,
// so each game keeps the last pre-kickoff quotes we saw (used to fit the popularity model later).
import { readFileSync, writeFileSync } from "node:fs";
import { ABBR, legForGame } from "../src/schedule.js";
import { loadGames } from "./nflverse.mjs";

const KEY = process.env.ODDS_API_KEY;
if (!KEY) { console.error("ODDS_API_KEY not set"); process.exit(1); }
// The Odds API keys. Caesars = williamhill_us. Up to 10 named books count as one region for quota (2 credits/pull).
const BOOKS = (process.env.ODDS_BOOKS || "pinnacle,betmgm,draftkings,fanduel,williamhill_us").split(",");
const FILE = new URL("../data/odds.json", import.meta.url);
const now = Date.now();

const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?apiKey=${KEY}&markets=h2h,spreads&oddsFormat=american&bookmakers=${BOOKS.join(",")}`;
const r = await fetch(url);
if (!r.ok) { console.error("Odds API", r.status, (await r.text()).slice(0, 200)); process.exit(1); }
console.log(`credits: this pull ${r.headers.get("x-requests-last")}, used ${r.headers.get("x-requests-used")}, remaining ${r.headers.get("x-requests-remaining")}`);
const games = await r.json();

let cur = { legs: {} };
try { cur = JSON.parse(readFileSync(FILE, "utf8")); } catch {}
cur.books = BOOKS;
delete cur.book;
// upgrade entries written by v2.0 (single book at the game level) to the per-book shape
for (const leg of Object.values(cur.legs)) for (const g of Object.values(leg.games || {})) {
  if (g.books || !g.ml) continue;
  const key = /nflverse/.test(g.source || "") ? "nflverse" : "draftkings";
  g.books = { [key]: { asof: g.asof, ml: g.ml, spread: g.spread || {} } };
  delete g.ml; delete g.spread; delete g.asof; delete g.source;
}

let n = 0, started = 0, skipped = [], perBook = {};
for (const g of games) {
  const away = ABBR[g.away_team], home = ABBR[g.home_team];
  const legId = away && home ? legForGame(away, home) : null;
  if (!legId) { skipped.push(`${g.away_team} @ ${g.home_team}`); continue; }
  if (new Date(g.commence_time).getTime() <= now) { started++; continue; }   // never overwrite a game that has kicked off
  const books = {};
  for (const bk of g.bookmakers) {
    const h2h = bk.markets.find((m) => m.key === "h2h"), sp = bk.markets.find((m) => m.key === "spreads");
    if (!h2h) continue;
    const ml = {}, spread = {};
    for (const o of h2h.outcomes) { const t = ABBR[o.name]; if (t) ml[t] = o.price; }
    for (const o of sp?.outcomes || []) { const t = ABBR[o.name]; if (t && o.point != null) spread[t] = o.point; }
    if (ml[away] == null || ml[home] == null) continue;                     // both prices from the same market object
    books[bk.key] = { asof: h2h.last_update, ml, spread };
    perBook[bk.key] = (perBook[bk.key] || 0) + 1;
  }
  if (!Object.keys(books).length) { skipped.push(`${away}@${home} (no two-sided ML at any book)`); continue; }
  const leg = (cur.legs[legId] ||= { games: {} });
  const key = `${away}@${home}`, old = leg.games[key];
  // keep the quotes from the previous refresh so the app can show how each number moved
  const prev = old?.books ? { asof: Object.values(old.books).map((b) => b.asof).filter(Boolean).sort().pop() || null, books: old.books } : old?.prev || null;
  leg.games[key] = { kickoff: g.commence_time, books, ...(prev ? { prev } : {}) };
  n++;
}

// Backfill: a game that has already kicked off and was never captured gets nflverse's closing moneylines,
// so locked legs still have a full set of market lines for fitting. Never applied to upcoming games.
let filled = 0;
try {
  for (const g of await loadGames()) {
    if (g.season !== "2026" || g.awayMl == null || g.homeMl == null) continue;
    const legId = legForGame(g.away, g.home); if (!legId) continue;
    const tz = g.gameday >= "2026-11-01" && g.gameday < "2027-03-08" ? "-05:00" : "-04:00";          // kickoff times are US Eastern
    const kickoff = new Date(`${g.gameday}T${g.gametime || "13:00"}:00${tz}`);
    if (!(kickoff.getTime() <= now)) continue;
    const leg = (cur.legs[legId] ||= { games: {} });
    const key = `${g.away}@${g.home}`; if (leg.games[key]) continue;
    const spread = g.spread == null ? {} : { [g.home]: -g.spread, [g.away]: g.spread };
    leg.games[key] = { kickoff: kickoff.toISOString(), books: { nflverse: { asof: kickoff.toISOString(), ml: { [g.away]: g.awayMl, [g.home]: g.homeMl }, spread } } };
    filled++;
  }
} catch (e) { console.warn("nflverse backfill skipped:", e.message); }
cur.prevUpdatedAt = cur.updatedAt || null;
cur.updatedAt = new Date(now).toISOString();
writeFileSync(FILE, JSON.stringify(cur, null, 1) + "\n");
console.log(`stored ${n} upcoming games (${started} already started, left as-is), backfilled ${filled} from nflverse closing lines`);
console.log("books per game:", Object.entries(perBook).map(([k, v]) => `${k} ${v}/${n}`).join(", ") || "none", skipped.length ? `· skipped: ${skipped.join(", ")}` : "");
