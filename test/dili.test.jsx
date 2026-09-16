// DILI: EV net of the future forfeit; and the futures-market prior for ratings.
import { buildData, computeEV, computeDili, STYLE, fvFor } from "../src/CircaSurvivorPlanner.jsx";
import { priorFromFutures } from "../src/ratings.js";
import { OPP, ALL_TEAMS, LEGS } from "../src/schedule.js";
let fails = 0; const ok = (name, cond, extra = "") => { console.log(name + ":", cond ? "OK" : "FAIL", extra); if (!cond) fails++; };

// synthetic world: flat ratings except a few strong teams, so future edges are known
const ratings = Object.fromEntries(ALL_TEAMS.map((t) => [t, 0]));
Object.assign(ratings, { KC: 9, BUF: 8, SF: 7, BAL: 3, TB: 3, PHI: 3 });
const bk = (a, h) => ({ asof: "2026-09-15T00:00:00Z", ml: { [a]: 150, [h]: -175 }, spread: {} });
const games = {}; for (const [t, g] of Object.entries(OPP.W2)) if (g.home) games[`${g.opp}@${t}`] = { kickoff: "2026-09-20T17:00:00Z", books: { draftkings: bk(g.opp, t), fanduel: bk(g.opp, t), betmgm: bk(g.opp, t) } };
const data = buildData({ picks: { entries: [] }, actuals: null, odds: { books: ["draftkings", "fanduel", "betmgm"], legs: { W2: { games } } }, ratings: { ratings } });
const mk = () => { const rows = {}; for (const t of ALL_TEAMS) { const ln = data.legs.W2.lines[t]; rows[t] = { win: ln?.win ?? null, pick: ln && ln.win > 0.5 ? 1 / 16 : 0, fv: fvFor("W2", t, data) }; } computeEV("W2", rows); return rows; };

let rows = mk(); computeDili("W2", rows, data, new Set(), "balanced");
const homes = Object.keys(OPP.W2).filter((t) => OPP.W2[t].home);
ok("every home favorite gets a DILI", homes.every((t) => rows[t].dili != null));
ok("DILI never exceeds EV", homes.every((t) => rows[t].dili <= rows[t].ev + 1e-12));
ok("a flat team keeps its full EV (no future edge)", Math.abs(rows.CIN.dili - rows.CIN.ev) < 1e-9 && rows.CIN.forfeit === 1);
ok("a stud pays a future forfeit", rows.KC.forfeit > 1.05 && rows.KC.dili < rows.KC.ev * 0.95, `KC forfeit ${rows.KC.forfeit.toFixed(3)}`);
ok("bigger stud, bigger forfeit", rows.KC.forfeit > rows.BAL.forfeit);
ok("burned teams get no DILI", (() => { const r = mk(); computeDili("W2", r, data, new Set(["KC"]), "balanced"); return r.KC.dili == null && r.BUF.dili != null; })());

// style: Future punishes studs harder than Now; calendar: the same stud is punished less late in the season
const rNow = mk(), rFut = mk(); computeDili("W2", rNow, data, new Set(), "now"); computeDili("W2", rFut, data, new Set(), "future");
ok("Future style cuts a stud more than Now", rFut.KC.dili < rNow.KC.dili && Math.abs(rFut.CIN.dili - rNow.CIN.dili) < 1e-9);
ok("style multipliers ordered", STYLE.now < STYLE.balanced && STYLE.balanced < STYLE.future);
const late = { ...data, legs: { W17: { ...data.legs.W2, lines: Object.fromEntries(Object.entries(data.legs.W2.lines).filter(([t]) => OPP.W17[t])) } } };
ok("late-season k is small", (() => { const r = {}; for (const t of ALL_TEAMS) r[t] = { win: late.legs.W17.lines[t]?.win ?? null, pick: 1 / 16, fv: 0 }; computeEV("W17", r); const k = computeDili("W17", r, late, new Set(), "future"); return k < 0.5; })());

// future value = expected strong spots: a stud has several, a flat team a few at most, and it separates a 67% week from a 62% one
ok("stud has more spots left than a flat team", fvFor("W2", "KC", data) > fvFor("W2", "CIN", data) + 3, `KC ${fvFor("W2", "KC", data).toFixed(1)} CIN ${fvFor("W2", "CIN", data).toFixed(1)}`);
ok("future value on a readable scale", fvFor("W2", "KC", data) < 18 && fvFor("W2", "KC", data) > 1);

// futures prior: monotone in title odds, centered, on a points scale
const probs = Object.fromEntries(ALL_TEAMS.map((t, i) => [t, 0.002 + 0.006 * i]));
const prior = priorFromFutures(probs);
ok("prior follows the odds", prior[ALL_TEAMS[31]] > prior[ALL_TEAMS[15]] && prior[ALL_TEAMS[15]] > prior[ALL_TEAMS[0]]);
ok("prior centered and points-scaled", Math.abs(Object.values(prior).reduce((a, b) => a + b, 0)) < 1 && Math.max(...Object.values(prior)) < 12 && Math.max(...Object.values(prior)) > 3);
ok("prior needs most teams", priorFromFutures({ KC: 0.1, BUF: 0.1 }) === null);
if (fails) { console.log(`${fails} FAILED`); process.exit(1); }
