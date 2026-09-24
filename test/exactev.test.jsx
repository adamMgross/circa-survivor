// Exact EV: the survivor-count convolution against brute force, its monotonicity, and the Week 1 and 2 orderings.
import fx from "./fixtures/w1w2.json";
import { OPP } from "../src/schedule.js";
import { buildData } from "../src/model/lines.js";
import { fitParams } from "../src/model/popularity.js";
import { computeStats } from "../src/model/board.js";
import { survivorDist, expectedShare, computeExactEV, computeEV } from "../src/model/value.js";
let fails = 0; const ok = (name, cond, extra = "") => { console.log(name + ":", cond ? "OK" : "FAIL", extra); if (!cond) fails++; };
const near = (a, b, tol = 1e-12) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

const slate = [
  { nHome: 7, nAway: 1, pHome: 0.81 }, { nHome: 3, nAway: 0, pHome: 0.62 },
  { nHome: 0, nAway: 5, pHome: 0.45 }, { nHome: 12, nAway: 2, pHome: 0.9 }, { nHome: 4, nAway: 4, pHome: 0.5 },
];
const brute = (w, n, others) => {
  let e = 0;
  for (let mask = 0; mask < 1 << others.length; mask++) {
    let p = 1, z = 0;
    others.forEach((g, i) => { const home = mask >> i & 1; p *= home ? g.pHome : 1 - g.pHome; z += home ? g.nHome : g.nAway; });
    e += p / (n + 1 + z);
  }
  return w * e;
};
ok("survivor distribution sums to 1", near(survivorDist(slate).reduce((a, b) => a + b, 0), 1));
ok("expected share equals brute-force enumeration for every candidate", slate.every((g, j) => {
  const others = slate.filter((_, i) => i !== j), dist = survivorDist(others);
  return near(expectedShare(g.pHome, g.nHome, dist), brute(g.pHome, g.nHome, others)) && near(expectedShare(1 - g.pHome, g.nAway, dist), brute(1 - g.pHome, g.nAway, others));
}));
const dist = survivorDist(slate.slice(1));
ok("expected share rises with the candidate's win probability", [0.5, 0.6, 0.7, 0.8, 0.9].every((w, i, a) => i === 0 || expectedShare(w, 5, dist) > expectedShare(a[i - 1], 5, dist)));
ok("expected share falls with the candidate's pick count", [0, 1, 5, 20, 100].every((n, i, a) => i === 0 || expectedShare(0.7, n, dist) < expectedShare(0.7, a[i - 1], dist)));

const data = buildData({ picks: { entries: [] }, actuals: fx.actuals, odds: fx.odds, ratings: fx.ratings });
const params = fitParams(data);
const favorites = (leg) => {
  const { rows } = computeStats(leg, data, params);
  const fav = Object.keys(OPP[leg]).filter((t) => rows[t].win > 0.6);
  const rank = (k) => [...fav].sort((a, b) => rows[b][k] - rows[a][k]);
  return { rows, ev: rank("ev"), evx: rank("evx") };
};
const w1 = favorites("W1"), w2 = favorites("W2");
ok("Week 1: exact EV ranks DET first where the linearized EV ranks JAX", w1.evx[0] === "DET" && w1.ev[0] === "JAX", `${w1.ev.join(" ")} | ${w1.evx.join(" ")}`);
ok("Week 2: exact EV ranks TB twelfth where the linearized EV ranks it fifth", w2.evx.indexOf("TB") === 11 && w2.ev.indexOf("TB") === 4, `${w2.ev.join(" ")} | ${w2.evx.join(" ")}`);
const scale = (leg, rows) => { const c = fx.actuals.legs[leg].picks; let a = 0, b = 0; for (const t of Object.keys(OPP[leg])) if (c[t] && rows[t].evx != null) { a += c[t] * rows[t].evx; b += c[t]; } return a / b; };
ok("exact EV is on the linearized scale: pick-weighted mean 1.00", near(scale("W1", w1.rows), 1, 1e-9) && near(scale("W2", w2.rows), 1, 1e-9));
ok("the two EVs agree within 10 percent on the Week 2 chalk", Math.abs(w2.rows.SF.evx / w2.rows.SF.ev - 1) < 0.1, `SF ${w2.rows.SF.ev.toFixed(3)} vs ${w2.rows.SF.evx.toFixed(3)}`);

const rows = Object.fromEntries(Object.keys(OPP.W1).map((t) => [t, { win: null, pick: 0.05 }]));
ok("exact EV blanked below the coverage floor, like the linearized EV", Object.values(computeExactEV("W1", rows, {})).every((v) => v == null) && computeEV("W1", rows).blanked);
const neutral = Object.fromEntries(Object.keys(OPP.W3).map((t) => [t, { win: OPP.W3[t].home ? 0.7 : 0.3, pick: 1 / 32 }]));
const n3 = computeExactEV("W3", neutral, Object.fromEntries(Object.keys(OPP.W3).map((t) => [t, 100])));
ok("a neutral-site game counts once", n3.BAL != null && n3.DAL != null && near(n3.BAL, n3.KC, 1e-9), `BAL ${n3.BAL} KC ${n3.KC}`);

if (fails) { console.error(`\n${fails} FAILED`); process.exit(1); }
