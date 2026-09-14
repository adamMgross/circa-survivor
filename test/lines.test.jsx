// True Win % from data/odds.json shapes: two-sided no-vig moneylines only, never from spreads.
import { linesFromOdds, devig, buildData } from "../src/CircaSurvivorPlanner.jsx";
const near = (a, b) => Math.abs(a - b) < 1e-9;
let fails = 0; const ok = (name, cond, extra = "") => { console.log(name + ":", cond ? "OK" : "FAIL", extra); if (!cond) fails++; };

const leg = { games: {
  "NE@SEA": { asof: "2026-09-14T20:00:00Z", ml: { NE: 150, SEA: -175 }, spread: { NE: 3.5, SEA: -3.5 } },
  "SF@LAR": { asof: "2026-09-14T21:00:00Z", ml: { SF: 240, LAR: -300 }, spread: { SF: 6.5, LAR: -6.5 } },
  "CHI@CAR": { asof: "2026-09-14T19:00:00Z", ml: { CHI: -110, CAR: -110 } },                       // no spread stored
  "BAL@IND": { asof: "2026-09-14T19:00:00Z", spread: { BAL: -3, IND: 3 } },                         // spread only → no Win %
  "TB@CIN": { asof: "2026-09-14T19:00:00Z", ml: { TB: 120 }, spread: { TB: 1, CIN: -1 } },          // one-sided → no Win %
  "BUF@HOU": { asof: "2026-09-14T19:00:00Z", ml: { BUF: -50, HOU: 40 } },                           // invalid MLs → no Win %
} };
const r = linesFromOdds(leg);
const qNE = 100 / 250, qSEA = 175 / 275;
ok("NE win matches formula", near(r.lines.NE.win, qNE / (qNE + qSEA)), r.lines.NE.win.toFixed(4));
ok("NE+SEA sum to 1", near(r.lines.NE.win + r.lines.SEA.win, 1));
ok("SF+LAR sum to 1", near(r.lines.SF.win + r.lines.LAR.win, 1));
ok("pick'em CHI = 50%", near(r.lines.CHI.win, 0.5));
ok("market flag + raw MLs kept", r.lines.SEA.market === true && r.lines.SEA.ml === -175 && r.lines.SEA.oppMl === 150);
ok("spread carried for display", r.lines.NE.spread === 3.5 && r.lines.CHI.spread === null);
ok("spread-only game has no Win %", r.lines.BAL === undefined && r.lines.IND === undefined);
ok("one-sided ML has no Win %", r.lines.TB === undefined);
ok("invalid ML (|ml|<100) has no Win %", r.lines.BUF === undefined);
ok("games counted / asof = latest", r.games === 3 && r.asof === "2026-09-14T21:00:00Z", `${r.games} ${r.asof}`);
ok("devig rejects junk", devig(null, -110) === null && devig("x", -110) === null && devig(100, 100).a === 0.5);

// buildData: legs keyed by id, book carried, actuals/contest defaulted
const d = buildData({ picks: { entries: [{ name: "A", picks: { W1: "SEA" } }] }, actuals: null, odds: { book: "draftkings", legs: { W1: leg } }, ratings: null });
ok("buildData legs", d.legs.W1.games === 3 && d.legs.W1.gamesTotal === 16 && d.legs.W1.book === "draftkings" && !d.legs.W2);
ok("buildData defaults", d.ratings === null && d.contest.start === 0 && Object.keys(d.actuals).length === 0 && d.entries.length === 1);
if (fails) { console.log(`${fails} FAILED`); process.exit(1); }
