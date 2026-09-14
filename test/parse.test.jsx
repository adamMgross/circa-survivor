// Ratings parsing + confirmation that pre-1.8 responses (LLM-reported win %) are rejected.
import { fetchLeg, fetchRatings, LEGS } from "../src/CircaSurvivorPlanner.jsx";
global.window = {}; let cur;
global.fetch = async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: cur }], stop_reason: "end_turn" }) });
const ALL = "ARI,ATL,BAL,BUF,CAR,CHI,CIN,CLE,DAL,DEN,DET,GB,HOU,IND,JAX,KC,LAC,LV,LAR,MIA,MIN,NE,NO,NYG,NYJ,PHI,PIT,SF,SEA,TB,TEN,WSH".split(",");
(async () => {
  cur = `Here you go:\n{"r":[${ALL.map((t, i) => `["${t}",${(i % 9) - 4}]`).join(",")}]}`;
  const r = await fetchRatings(); console.log("ratings parsed:", Object.keys(r.ratings).length === 32 ? "OK" : "FAIL", "| WSH alias → WAS:", "WAS" in r.ratings ? "OK" : "FAIL");
  cur = `{"r":[["KC",6],["BUF",5]]}`;
  try { await fetchRatings(); console.log("FAIL accepted 2 teams"); } catch (e) { console.log("incomplete ratings rejected: OK"); }
  cur = `{"l":[["SEA",-3.5,62],["NE",3.5,38]],"p":[["SEA",30]]}`;
  try { await fetchLeg(LEGS[0]); console.log("FAIL: accepted LLM-reported win %"); } catch (e) { console.log("old-format (LLM win %, no moneylines) rejected: OK"); }
})();
