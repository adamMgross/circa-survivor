// Power-rating fit recovers known ratings from synthetic spreads, and shrinks with no data.
import { fitRatings, HFA } from "../src/ratings.js";
import { ALL_TEAMS, LEGS, OPP } from "../src/schedule.js";
let fails = 0; const ok = (name, cond, extra = "") => { console.log(name + ":", cond ? "OK" : "FAIL", extra); if (!cond) fails++; };

// true ratings: evenly spread −8..+8, mean 0
const truth = Object.fromEntries(ALL_TEAMS.map((t, i) => [t, Math.round(((i / 31) * 16 - 8) * 10) / 10]));
const mean = Object.values(truth).reduce((a, b) => a + b, 0) / 32;
for (const t of ALL_TEAMS) truth[t] = Math.round((truth[t] - mean) * 10) / 10;
// spreads for the first 6 legs of the real schedule, exactly consistent with truth + HFA
const games = [];
for (const leg of LEGS.slice(0, 6)) for (const [t, g] of Object.entries(OPP[leg.id])) if (g.home) games.push({ home: t, away: g.opp, neutral: g.neutral, margin: truth[t] - truth[g.opp] + (g.neutral ? 0 : HFA) });
const { ratings, games: used } = fitRatings(games, { lambda: 0.01 });
const maxErr = Math.max(...ALL_TEAMS.map((t) => Math.abs(ratings[t] - truth[t])));
ok(`recovers truth from ${used} games`, maxErr <= 0.15, `max error ${maxErr.toFixed(2)}`);
ok("ratings centered on 0", Math.abs(Object.values(ratings).reduce((a, b) => a + b, 0)) < 0.5);
const empty = fitRatings([], { lambda: 2, prior: { KC: 5 } });
ok("no games → prior", empty.games === 0 && empty.ratings.KC > 4 && empty.ratings.ARI < 0, `KC ${empty.ratings.KC}`);
const shrunk = fitRatings(games.slice(0, 16), { lambda: 3 });
ok("heavy shrinkage narrows the spread", Math.max(...Object.values(shrunk.ratings)) < Math.max(...Object.values(truth)));
if (fails) { console.log(`${fails} FAILED`); process.exit(1); }
