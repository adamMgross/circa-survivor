// Which week the dashboard opens on: the first one whose results are not final.
import { openLeg } from "../src/model/field.js";
import { LEGS } from "../src/schedule.js";
let fails = 0; const ok = (name, cond, extra = "") => { console.log(name + ":", cond ? "OK" : "FAIL", extra); if (!cond) fails++; };
const final = { picks: { KC: 1 }, won: ["KC"], lost: [], pending: [] };
const live  = { picks: { KC: 1, SF: 1 }, won: ["KC"], lost: [], pending: ["SF"] };
const at = (iso) => new Date(iso).getTime();

ok("nothing played yet → week 1", openLeg({}, at("2026-09-09T12:00:00Z")) === "W1");
ok("week 1 final, week 2 not locked → week 2", openLeg({ W1: final }, at("2026-09-16T12:00:00Z")) === "W2");

// the actual bug: Circa posts picks Saturday evening, so W2 gets an actuals entry while every game is still to come
ok("picks posted but no games played → stays on that week", openLeg({ W1: final, W2: { ...live, won: [], pending: ["KC", "SF"] } }, at("2026-09-19T23:00:00Z")) === "W2");
ok("Sunday night, games still pending → stays", openLeg({ W1: final, W2: live }, at("2026-09-20T23:00:00Z")) === "W2");
ok("Monday night, MNF still pending → stays", openLeg({ W1: final, W2: live }, at("2026-09-22T02:00:00Z")) === "W2");
ok("Tuesday, week final → moves to week 3", openLeg({ W1: final, W2: final }, at("2026-09-22T14:00:00Z")) === "W3");

// a result that never lands must not strand the dashboard forever
ok("stuck pending, next week not started → still holds", openLeg({ W1: final, W2: live }, at("2026-09-23T12:00:00Z")) === "W2");
ok("stuck pending, next week under way → moves on anyway", openLeg({ W1: final, W2: live }, at("2026-09-25T12:00:00Z")) === "W3");

// holiday legs end midweek, so a Monday-night rule would have been wrong for them
const upTo = (id) => Object.fromEntries(LEGS.slice(0, LEGS.findIndex((l) => l.id === id)).map((l) => [l.id, final]));
ok("Thanksgiving leg holds while its games run", openLeg({ ...upTo("TG"), TG: live }, at("2026-11-26T20:00:00Z")) === "TG");
ok("Thanksgiving final → moves to week 12", openLeg({ ...upTo("TG"), TG: final }, at("2026-11-28T12:00:00Z")) === "W12");
ok("Christmas leg holds while its games run", openLeg({ ...upTo("XM"), XM: live }, at("2026-12-25T20:00:00Z")) === "XM");

ok("all 20 weeks final → last week", openLeg(Object.fromEntries(LEGS.map((l) => [l.id, final])), at("2027-01-12T12:00:00Z")) === "W18");
if (fails) { console.log(`${fails} FAILED`); process.exit(1); }
