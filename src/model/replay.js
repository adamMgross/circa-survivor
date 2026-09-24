import { LEGS } from "../schedule.js";
import { oddsGameFromApi } from "./lines.js";

const deadlineOf = (legId) => Date.parse(LEGS.find((l) => l.id === legId).deadline);

// The raw Odds API games of the leg that locks next after pulledAt (ISO), unmodified, or null when no leg is ahead.
export function oddsSnapshot(apiGames, pulledAt) {
  const leg = LEGS.find((l) => Date.parse(l.deadline) > Date.parse(pulledAt));
  if (!leg) return null;
  return { pulledAt, legId: leg.id, deadline: leg.deadline, games: apiGames.filter((g) => oddsGameFromApi(g)?.legId === leg.id) };
}

// The last snapshot of legId taken before its deadline, or null.
export function deadlineSnapshot(legId, snapshots) {
  const lock = deadlineOf(legId);
  return snapshots.filter((s) => s.legId === legId && Date.parse(s.pulledAt) < lock)
    .reduce((best, s) => (!best || Date.parse(s.pulledAt) > Date.parse(best.pulledAt) ? s : best), null);
}

// A snapshot as one leg of data/odds.json, holding the games that had not kicked off when it was pulled.
// Throws on a snapshot pulled at or after the leg's deadline, which would be look-ahead in a replay.
export function legOddsFromSnapshot(snapshot) {
  const pulled = Date.parse(snapshot.pulledAt);
  if (!(pulled < deadlineOf(snapshot.legId))) throw new Error(`snapshot of ${snapshot.legId} pulled ${snapshot.pulledAt}, not before its deadline`);
  const games = {};
  for (const g of snapshot.games) {
    const game = oddsGameFromApi(g);
    if (!game || game.legId !== snapshot.legId || Date.parse(game.kickoff) <= pulled || !Object.keys(game.books).length) continue;
    games[game.key] = { kickoff: game.kickoff, books: game.books };
  }
  return { games };
}
