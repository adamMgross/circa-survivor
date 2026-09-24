// Holiday feasibility (rules 8 and 9): the recommender refuses a pick that leaves no team for a holiday leg.
import fx from "./fixtures/w1w2.json";
import { HOLIDAY_TEAMS, OPP, LEGS } from "../src/schedule.js";
import { buildData } from "../src/model/lines.js";
import { fitParams } from "../src/model/popularity.js";
import { boardStats } from "../src/model/board.js";
import { gauntletFeasible } from "../src/model/value.js";
let fails = 0; const ok = (name, cond, extra = "") => { console.log(name + ":", cond ? "OK" : "FAIL", extra); if (!cond) fails++; };

ok("holiday team lists match the schedule's holiday legs", ["TG", "XM"].every((id) => [...HOLIDAY_TEAMS[id]].sort().join() === Object.keys(OPP[id]).sort().join()));
ok("rules 8a and 9a: ten Thanksgiving teams, eight Christmas teams, twelve in the union", HOLIDAY_TEAMS.TG.size === 10 && HOLIDAY_TEAMS.XM.size === 8 && new Set([...HOLIDAY_TEAMS.TG, ...HOLIDAY_TEAMS.XM]).size === 12);

const union = [...new Set([...HOLIDAY_TEAMS.TG, ...HOLIDAY_TEAMS.XM])];
const holding = (kept) => Object.fromEntries(union.filter((t) => !kept.includes(t)).map((t, i) => [LEGS[i].id, t]));   // W1..W10 spend the rest of the union
ok("spending the eleventh union team in Week 11 leaves one and is infeasible", !gauntletFeasible(holding(["PHI", "GB"]), "W11", "GB"));
ok("one Thanksgiving-only and one Christmas-only team is feasible", gauntletFeasible(holding(["DET", "SEA"]), "W11", "NE"));
ok("spending the last Christmas team on an ordinary week is infeasible", !gauntletFeasible(holding(["DET", "SEA"]), "W11", "SEA"));
ok("spending the last Thanksgiving team on an ordinary week is infeasible", !gauntletFeasible(holding(["DET", "SEA"]), "W11", "DET"));
ok("two dual-eligible teams cover both legs", gauntletFeasible(holding(["PHI", "GB"]), "W11", "NE"));
ok("two Thanksgiving-only teams cannot cover Christmas", !gauntletFeasible(holding(["DET", "DAL"]), "W11", "NE"));
const xmOnly = { W1: "HOU", W2: "PHI", W3: "GB", W4: "CHI", W5: "BUF", W6: "DEN", W7: "LAR" };   // SEA is the last Christmas team
ok("with Thanksgiving planned, one Christmas team is enough", gauntletFeasible({ ...xmOnly, TG: "DET" }, "W8", "NE") && !gauntletFeasible({ ...xmOnly, TG: "DET" }, "W8", "SEA"));
ok("on the Christmas leg itself the pick fills the slot", gauntletFeasible({ ...xmOnly, TG: "DET" }, "XM", "SEA"));
ok("a holiday leg already behind the pick is not required again", gauntletFeasible({ ...xmOnly, TG: "DET", XM: "SEA" }, "W16", "KC"));
ok("the empty plan is feasible for every Week 1 team", Object.keys(OPP.W1).every((t) => gauntletFeasible({}, "W1", t)));

const data = buildData({ picks: { entries: [] }, actuals: fx.actuals, odds: fx.odds, ratings: fx.ratings });
const params = fitParams(data);
const picks = { W1: "HOU", W3: "PHI", W4: "GB", W5: "CHI", W6: "BUF", W7: "DEN", W8: "LAR" };
const { rows } = boardStats("W2", data, params, picks, "balanced");
ok("the recommender refuses the last Christmas team instead of docking it", rows.SEA.infeasible === true && rows.SEA.dili == null && !rows.SEA.diliTop && !rows.SEA.evTop && !rows.SEA.evxTop, JSON.stringify({ dili: rows.SEA.dili, ev: rows.SEA.ev }));
ok("feasible picks keep their DILI", Object.keys(OPP.W2).filter((t) => !Object.values(picks).includes(t) && t !== "SEA" && rows[t].ev != null).every((t) => !rows[t].infeasible && rows[t].dili != null));

if (fails) { console.error(`\n${fails} FAILED`); process.exit(1); }
