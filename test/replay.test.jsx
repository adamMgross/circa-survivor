// The deadline odds archive: which leg a pull archives, the raw games it keeps, and a replay that refuses look-ahead.
import fx from "./fixtures/odds-api-2026-09-24.json";
import { LEGS, legLockingAfter } from "../src/schedule.js";
import { oddsGameFromApi, linesFromOdds } from "../src/model/lines.js";
import { oddsSnapshot, deadlineSnapshot, legOddsFromSnapshot } from "../src/model/replay.js";
let fails = 0; const ok = (name, cond, extra = "") => { console.log(name + ":", cond ? "OK" : "FAIL", extra); if (!cond) fails++; };
const throws = (f) => { try { f(); return false; } catch { return true; } };

ok("an unknown team is not on the schedule", oddsGameFromApi(fx.games.find((g) => g.id === "unknown")) === null);
const oneSided = oddsGameFromApi(fx.games.find((g) => g.id === "one-sided"));
ok("a book with one moneyline is dropped", oneSided && Object.keys(oneSided.books).length === 0);

const snap = oddsSnapshot(fx.games, fx.now);
const w3 = fx.games.filter((g) => g.id.startsWith("W3-"));
ok("a Thursday pull archives the leg that locks that Saturday", snap.legId === "W3" && snap.deadline === LEGS.find((l) => l.id === "W3").deadline);
ok("the archive keeps that leg's games exactly as the API sent them", snap.games.length === w3.length && snap.games.every((g, i) => g === w3[i]));
ok("no leg is archived after the last deadline", oddsSnapshot(fx.games, "2027-01-11T00:00:00Z") === null);

const leg = legOddsFromSnapshot(snap);
const started = w3.find((g) => Date.parse(g.commence_time) <= Date.parse(fx.now));
ok("a replay leaves out games that had kicked off at the pull", started && !(oddsGameFromApi(started).key in leg.games) && Object.keys(leg.games).length === w3.length - 1);
const lines = linesFromOdds(leg);
ok("a replayed snapshot de-vigs to a Win % for every upcoming game", lines.games === w3.length - 1 && Object.values(lines.lines).every((l) => l.win > 0 && l.win < 1), `${lines.games} games`);

const lock = Date.parse(snap.deadline), at = (ms) => ({ ...snap, pulledAt: new Date(ms).toISOString() });
ok("a snapshot pulled after the deadline raises", throws(() => legOddsFromSnapshot(at(lock + 60e3))));
ok("a snapshot pulled at the deadline raises", throws(() => legOddsFromSnapshot(at(lock))));
ok("a snapshot pulled a minute before the deadline replays", !throws(() => legOddsFromSnapshot(at(lock - 60e3))));
const early = at(lock - 30 * 3600e3), last = at(lock - 43 * 60e3), after = at(lock + 3600e3);
ok("the deadline snapshot is the last one pulled before the lock", deadlineSnapshot("W3", [after, early, last]) === last && deadlineSnapshot("W4", [early, last]) === null);

ok("each leg is the one locking next until its own deadline", LEGS.every((l, i) => legLockingAfter(Date.parse(l.deadline) - 1) === l && legLockingAfter(Date.parse(l.deadline)) === (LEGS[i + 1] || null)));

if (fails) { console.error(`\n${fails} FAILED`); process.exit(1); }
