// Record the field models' shares for the leg that locks next, fit on the legs before it. Rewritten on every pull
// until that leg's deadline, so the file left standing is the last prediction made before it.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { legLockingAfter } from "../src/schedule.js";
import { buildData } from "../src/model/lines.js";
import { predictionRecord } from "../src/model/popularity.js";

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), "utf8"));
const now = Date.now();
const leg = legLockingAfter(now);
if (!leg) { console.log("no leg ahead, nothing recorded"); process.exit(0); }
const data = buildData({ picks: read("picks"), actuals: read("actuals"), odds: read("odds"), ratings: read("ratings") }, false);
const record = predictionRecord(leg.id, data, new Date(now).toISOString());
const dir = new URL("../data/predictions/", import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL(`${leg.id}.json`, dir), JSON.stringify(record, null, 1) + "\n");
const top = (s) => Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, v]) => `${t} ${(v * 100).toFixed(1)}%`).join(", ");
for (const [name, m] of Object.entries(record.models)) console.log(`${leg.id} ${name}: ${top(m.shares) || "no prediction"}`);
