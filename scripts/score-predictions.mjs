// Score every recorded prediction whose leg Circa has posted, in nats per entry (lower is better).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { LEGS } from "../src/schedule.js";
import { scorePrediction } from "../src/model/popularity.js";

const dir = new URL("../data/predictions/", import.meta.url);
const actuals = JSON.parse(readFileSync(new URL("../data/actuals.json", import.meta.url), "utf8")).legs || {};
const legs = existsSync(dir) ? LEGS.filter((l) => readdirSync(dir).includes(`${l.id}.json`)) : [];
console.log("leg   made at (UTC)      likelihood  jamie   chalk");
for (const l of legs) {
  const rec = JSON.parse(readFileSync(new URL(`${l.id}.json`, dir), "utf8"));
  if (!actuals[l.id]) { console.log(`${l.id.padEnd(5)} ${rec.madeAt.slice(0, 16)}  not posted yet`); continue; }
  const s = scorePrediction(rec, actuals[l.id].picks), f = (v) => (v == null ? "   -  " : v.toFixed(3)).padStart(7);
  console.log(`${l.id.padEnd(5)} ${rec.madeAt.slice(0, 16)}  ${f(s.likelihood)}    ${f(s.jamie)} ${f(s.chalk)}`);
}
