import { fetchLeg, LEGS } from "../src/CircaSurvivorPlanner.jsx";
global.window={}; let cur;
global.fetch=async()=>({ok:true,json:async()=>({content:[{type:"text",text:cur}],stop_reason:"end_turn"})});
(async()=>{
 cur=`{"l":[["LAC",-9.5,77],["ARI",9.5,23],["JAX",-8.5,75],["CLE",8.5,25],["DAL",3,42],["NYG",-3,58],["BAL",-3,57],["IND",3,43]],"p":[["LAC",32],["JAX",26],["DAL",1],["BAL",1]]}`;
 let r=await fetchLeg(LEGS[0]); console.log("ints:",r.pick, "LAC win", r.lines.LAC.win);
 cur=`{"l":[["LAC",-9.5,0.77],["ARI",9.5,0.23],["JAX",-8.5,0.75],["CLE",8.5,0.25]],"p":[["LAC",0.32],["JAX",0.26],["DAL",0.01],["BAL",0.01]]}`;
 r=await fetchLeg(LEGS[0]); console.log("fracs:",r.pick, "LAC win", r.lines.LAC.win);
})();
