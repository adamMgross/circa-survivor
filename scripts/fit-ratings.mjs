// Fit power ratings from market spreads: nflverse closing lines for every 2026 game that has one,
// plus the current DraftKings spreads in data/odds.json for games nflverse hasn't lined yet.
import { readFileSync, writeFileSync } from "node:fs";
import { fitRatings } from "../src/ratings.js";
import { loadGames } from "./nflverse.mjs";

const OUT = new URL("../data/ratings.json", import.meta.url);
const ODDS = new URL("../data/odds.json", import.meta.url);

const games = [], last = [], seen = new Set();
for (const r of await loadGames()) {
  if (r.spread == null) continue;
  const g = { home: r.home, away: r.away, margin: r.spread, neutral: r.neutral };
  if (r.season === "2025") last.push(g);
  if (r.season === "2026") { games.push(g); seen.add(`${r.away}@${r.home}`); }
}
// prior = last season's market ratings, regressed 40% toward average (teams change in the offseason)
const prev = fitRatings(last, { lambda: 0.5 }).ratings;
const prior = Object.fromEntries(Object.entries(prev).map(([t, r]) => [t, 0.6 * r]));
const fromNflverse = games.length;
try {
  const odds = JSON.parse(readFileSync(ODDS, "utf8"));
  for (const leg of Object.values(odds.legs || {})) for (const [key, g] of Object.entries(leg.games || {})) {
    if (seen.has(key)) continue;
    const [away, home] = key.split("@");
    if (g.spread?.[home] == null) continue;
    games.push({ home, away, margin: -g.spread[home], neutral: false });
  }
} catch {}
const { ratings, games: used } = fitRatings(games, { lambda: 3, prior });
writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), source: `market spreads: ${used} games this season (nflverse closing lines + current book), shrunk toward last season`, games: used, ratings }, null, 1) + "\n");
const top = Object.entries(ratings).sort((a, b) => b[1] - a[1]);
console.log(`ratings from ${used} games (${fromNflverse} nflverse, prior from ${last.length} 2025 games)`, "top:", top.slice(0, 5).map(([t, r]) => `${t} ${r}`).join(", "), "bottom:", top.slice(-3).map(([t, r]) => `${t} ${r}`).join(", "));
