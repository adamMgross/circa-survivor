import { fetchLeg, LEGS, OPP } from "../src/CircaSurvivorPlanner.jsx";
global.window = {}; let cur;
global.fetch = async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: cur }], stop_reason: "end_turn" }) });
const W1 = LEGS[0];
const near = (a, b) => Math.abs(a - b) < 1e-9;
(async () => {
  // 1. formula check against the spec: NE +150 / SEA -175
  cur = `{"ml":[["NE",150,"SEA",-175],["SF","+240","LAR","-300"],["CHI",-110,"CAR",-110],["TB","EVEN","CIN",-120]],"l":[["SEA",-3.5],["NE",3.5],["LAR",-6.5],["SF",6.5]],"p":[["LAC",28]],"book":"DraftKings","asof":"Sep 14 1:55 PM ET","src":"estimate"}`;
  let r = await fetchLeg(W1);
  const qNE = 100 / 250, qSEA = 175 / 275;
  console.log("NE win", r.lines.NE.win.toFixed(4), "expected", (qNE / (qNE + qSEA)).toFixed(4), near(r.lines.NE.win, qNE / (qNE + qSEA)) ? "OK" : "FAIL");
  console.log("SEA+NE sum to 1:", near(r.lines.SEA.win + r.lines.NE.win, 1) ? "OK" : "FAIL", "| SF+LAR:", near(r.lines.SF.win + r.lines.LAR.win, 1) ? "OK" : "FAIL", "| pickem CHI:", r.lines.CHI.win.toFixed(3), "| EVEN TB:", r.lines.TB.win.toFixed(3));
  console.log("string MLs parsed:", r.lines.SF.ml === 240 && r.lines.LAR.ml === -300 ? "OK" : "FAIL", "| market flag:", r.lines.SEA.market === true ? "OK" : "FAIL", "| book/asof:", r.book, "/", r.asof, "| games:", r.games, "/", r.gamesTotal);
  // 2. spread present but NO moneyline for a game → Win % unavailable, no spread fallback
  console.log("BAL (spread only? none) win:", r.lines.BAL?.win === undefined || r.lines.BAL?.win === null ? "OK unavailable" : "FAIL " + r.lines.BAL.win);
  cur = `{"ml":[["NE",150,"SEA",-175]],"l":[["BAL",-3],["IND",3],["SEA",-3.5]],"p":[],"book":"FanDuel"}`;
  r = await fetchLeg(W1);
  console.log("BAL spread stored:", r.lines.BAL.spread, "| BAL win:", r.lines.BAL.win === null ? "OK null (no spread fallback)" : "FAIL " + r.lines.BAL.win, "| market:", r.lines.BAL.market);
  // 3. one-sided / invalid moneylines → rejected
  cur = `{"ml":[["NE",150,"SEA",-50],["SF",240,"LAR",null]],"l":[],"p":[],"book":"X"}`;
  try { r = await fetchLeg(W1); console.log("FAIL should have thrown, got", Object.keys(r.lines)); } catch (e) { console.log("invalid/one-sided MLs → error:", e.message.slice(0, 40), "OK"); }
  // 4. wrong matchup pairing → ignored
  cur = `{"ml":[["NE",150,"LAR",-175],["SF",240,"LAR",-300]],"l":[],"p":[],"book":"X"}`;
  r = await fetchLeg(W1);
  console.log("mismatched pairing ignored:", r.lines.NE === undefined && r.lines.SF.market ? "OK" : "FAIL");
  // 5. no "ml" section at all (old-style response with win %) → error, not silent use of LLM win %
  cur = `{"l":[["SEA",-3.5,62],["NE",3.5,38]],"p":[["SEA",30]]}`;
  try { r = await fetchLeg(W1); console.log("FAIL used LLM win%", r.lines.SEA); } catch (e) { console.log("LLM win % without MLs → error OK"); }
})();
