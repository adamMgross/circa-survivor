// Pull two-sided moneylines + spreads for upcoming NFL games from The Odds API and merge them into
// data/odds.json, keyed by Circa leg and "AWAY@HOME". A game is only overwritten while it is still
// upcoming, so each game keeps the last pre-kickoff line we saw (used to fit the popularity model later).
import { readFileSync, writeFileSync } from "node:fs";
import { ABBR, legForGame } from "../src/schedule.js";
import { loadGames } from "./nflverse.mjs";

const KEY = process.env.ODDS_API_KEY;
if (!KEY) { console.error("ODDS_API_KEY not set"); process.exit(1); }
const BOOK = process.env.ODDS_BOOK || "draftkings";
const FILE = new URL("../data/odds.json", import.meta.url);

const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?apiKey=${KEY}&regions=us&markets=h2h,spreads&oddsFormat=american&bookmakers=${BOOK}`;
const r = await fetch(url);
if (!r.ok) { console.error("Odds API", r.status, (await r.text()).slice(0, 200)); process.exit(1); }
console.log("credits used:", r.headers.get("x-requests-used"), "remaining:", r.headers.get("x-requests-remaining"));
const games = await r.json();

let cur = { book: BOOK, updatedAt: null, legs: {} };
try { cur = JSON.parse(readFileSync(FILE, "utf8")); } catch {}
cur.book = BOOK;

let n = 0, skipped = [];
for (const g of games) {
  const away = ABBR[g.away_team], home = ABBR[g.home_team];
  const legId = away && home ? legForGame(away, home) : null;
  if (!legId) { skipped.push(`${g.away_team} @ ${g.home_team}`); continue; }
  const bk = g.bookmakers.find((b) => b.key === BOOK); if (!bk) continue;
  const h2h = bk.markets.find((m) => m.key === "h2h"), sp = bk.markets.find((m) => m.key === "spreads");
  const ml = {}, spread = {};
  for (const o of h2h?.outcomes || []) { const t = ABBR[o.name]; if (t) ml[t] = o.price; }
  for (const o of sp?.outcomes || []) { const t = ABBR[o.name]; if (t && o.point != null) spread[t] = o.point; }
  if (ml[away] == null || ml[home] == null) { skipped.push(`${away}@${home} (no two-sided ML)`); continue; }
  const leg = (cur.legs[legId] ||= { games: {} });
  leg.games[`${away}@${home}`] = { kickoff: g.commence_time, asof: h2h.last_update, ml, spread };
  n++;
}
// Backfill: any 2026 game we never captured (kicked off before a pull, or the book skipped it) gets
// nflverse's closing moneylines, so every locked leg still has a full set of market lines.
let filled = 0;
try {
  for (const g of await loadGames()) {
    if (g.season !== "2026" || g.awayMl == null || g.homeMl == null) continue;
    const legId = legForGame(g.away, g.home); if (!legId) continue;
    const leg = (cur.legs[legId] ||= { games: {} });
    const key = `${g.away}@${g.home}`; if (leg.games[key]) continue;
    const spread = g.spread == null ? {} : { [g.home]: -g.spread, [g.away]: g.spread };
    leg.games[key] = { kickoff: `${g.gameday}T${g.gametime || "00:00"}`, asof: `${g.gameday}T${g.gametime || "00:00"}`, ml: { [g.away]: g.awayMl, [g.home]: g.homeMl }, spread, source: "nflverse closing line" };
    filled++;
  }
} catch (e) { console.warn("nflverse backfill skipped:", e.message); }
cur.updatedAt = new Date().toISOString();
writeFileSync(FILE, JSON.stringify(cur, null, 1) + "\n");
console.log(`stored ${n} games from ${BOOK}, backfilled ${filled} from nflverse closing lines`, skipped.length ? `· skipped: ${skipped.join(", ")}` : "");
