import { extract, fetchLeg, fetchRatings, OPP, LEGS } from "../src/CircaSurvivorPlanner.jsx";
const W1 = LEGS[0];
const teams = Object.keys(OPP.W1);
const full = teams.map((t)=>`["${t}",${OPP.W1[t].home?-3:3},${OPP.W1[t].home?58:42}]`).join(",");
const cases = {
  clean: [{type:"text",text:`{"l":[${full}],"p":[["LAC",28],["JAX",23],["DET",14]]}`}],
  fenced_prose: [{type:"text",text:"Here are the lines:\n```json\n{\"l\":[" + full + "],\"p\":[[\"LAC\",28]]}\n```\nLet me know!"}],
  split_citations: [
    {type:"server_tool_use",name:"web_search"},{type:"web_search_tool_result"},
    {type:"text",text:"Based on my searches: "},{type:"text",text:`{"l":[["SEA",-3.`},{type:"text",text:`5,62],["NE",3.5,38],["LAR",-6,`,citations:[{}]},{type:"text",text:`69],["SF",6,31]],"p":[["LAC",28],["JA`},{type:"text",text:`X",23]]}`}],
  object_style: [{type:"text",text:`{"l":{"SEA":{"spread":-3.5,"win":0.62},"NE":{"win":0.38,"spread":3.5},"LAR":[-6,69]},"p":{"LAC":0.28,"JAX":23}}`}],
  aliases_decimals: [{type:"text",text:`{"l":[["WSH",3,0.38],["PHI",-3,0.62],["JAC",-8.5,0.77],["LA",-6,0.69]],"p":[["WSH",2],["JAC",23]]}`}],
  truncated: [{type:"text",text:`{"l":[["SEA",-3.5,62],["NE",3.5,38],["LAR",-6,69],["SF",6,3`}],
  only_favorites: [{type:"text",text:`{"l":[["SEA",-3.5,62],["LAR",-6,69],["JAX",-8.5,77]],"p":[["JAX",30]]}`}],
  no_win: [{type:"text",text:`{"l":[["SEA",-3.5],["LAR",-6],["JAX",-8.5]],"p":[]}`}],
  garbage: [{type:"text",text:"I couldn't find lines for these games."}],
  max_tokens: [{type:"text",text:"Searching for lines"}],
};
const ratingsTxt = `{"r":[${["ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE","DAL","DEN","DET","GB","HOU","IND","JAX","KC","LAC","LV","LAR","MIA","MIN","NE","NO","NYG","NYJ","PHI","PIT","SF","SEA","TB","TEN","WSH"].map((t,i)=>`["${t}",${(i%9)-4}]`).join(",")}]}`;
let current;
global.window = { __lastRaw:null };
global.fetch = async () => ({ ok:true, json: async () => ({ content: current, stop_reason: current===cases.max_tokens?"max_tokens":"end_turn" }) });
(async () => {
  for (const [name, content] of Object.entries(cases)) {
    current = content;
    try { const r = await fetchLeg(W1); console.log(name.padEnd(16), "OK  lines:", Object.keys(r.lines).length, "picks:", Object.keys(r.pick).length, "SEA:", JSON.stringify(r.lines.SEA), "WAS:", JSON.stringify(r.lines.WAS)); }
    catch (e) { console.log(name.padEnd(16), "FAIL", e.message.slice(0,90)); }
  }
  current=[{type:"text",text:ratingsTxt}];
  const r = await fetchRatings(); console.log("ratings         OK", Object.keys(r.ratings).length, "WAS:", r.ratings.WAS);
})();
