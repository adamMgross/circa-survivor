// Which entries are still alive, and what that means for picking.
import { entryStatus } from "../src/model/field.js";
let fails = 0; const ok = (name, cond, extra = "") => { console.log(name + ":", cond ? "OK" : "FAIL", extra); if (!cond) fails++; };
const leg = (won, lost, pending = []) => ({ picks: {}, won, lost, pending });
const W1 = leg(["DET", "JAX", "PIT"], ["LAC", "TEN"]);
const W2live = leg(["SF"], ["TB", "LAC"], ["LAR"]);          // week 2 as it stood with the Rams unplayed
const W2done = leg(["SF", "LAR"], ["TB", "LAC"]);

const e = (picks) => ({ name: "x", picks });
ok("winner stays alive", entryStatus(e({ W1: "DET", W2: "SF" }), { W1, W2: W2live }).alive);
ok("a losing pick ends it", entryStatus(e({ W1: "DET", W2: "TB" }), { W1, W2: W2live }).alive === false);
ok("it reports the week it died", entryStatus(e({ W1: "DET", W2: "LAC" }), { W1, W2: W2live }).leg.id === "W2");
ok("dying in week 1 reports week 1", entryStatus(e({ W1: "LAC", W2: "SF" }), { W1, W2: W2live }).leg.id === "W1");
ok("a pending week cannot eliminate you", entryStatus(e({ W1: "DET", W2: "LAR" }), { W1, W2: W2live }).alive);
ok("no pick in a finished week ends it", entryStatus(e({ W1: "DET" }), { W1, W2: W2done }).alive === false);
ok("no pick in a week still running does not", entryStatus(e({ W1: "DET" }), { W1, W2: W2live }).alive);
ok("weeks with no results yet are ignored", entryStatus(e({ W1: "DET", W2: "SF", W3: "KC" }), { W1, W2: W2done }).alive);
ok("nothing played at all → alive", entryStatus(e({}), {}).alive);
if (fails) { console.log(`${fails} FAILED`); process.exit(1); }
