// nflverse game data (schedule, results, closing lines) for every NFL game. Free, public, updated daily.
import { norm } from "../src/schedule.js";
const SRC = "https://github.com/nflverse/nfldata/raw/master/data/games.csv";
export async function loadGames() {
  const csv = await (await fetch(SRC)).text();
  const [hdr, ...rows] = csv.trim().split("\n");
  const cols = hdr.split(",");
  const num = (v) => (v === "" || v === "NA" || v == null ? null : parseFloat(v));
  return rows.map((line) => {
    const v = line.split(","); const r = Object.fromEntries(cols.map((c, i) => [c, v[i]]));
    return { season: r.season, type: r.game_type, week: +r.week, gameday: r.gameday, gametime: r.gametime, home: norm(r.home_team), away: norm(r.away_team),
      neutral: r.location === "Neutral", spread: num(r.spread_line), awayMl: num(r.away_moneyline), homeMl: num(r.home_moneyline), result: num(r.result) };
  }).filter((g) => g.type === "REG" && g.home && g.away);
}
