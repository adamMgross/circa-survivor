// Market-based power ratings: fit one number per team (points vs. an average team on a neutral field)
// so that home rating − away rating + home-field ≈ the market spread, across every game with a line.
// Ridge shrinkage toward 0 keeps early-season estimates sane; the fit sharpens every week.
import { ALL_TEAMS } from "./schedule.js";

export const HFA = 2;

// games: [{ home, away, margin, neutral, weight }] where margin = expected home margin (spread from home view, positive = home favored)
// prior: optional {team: rating} the fit is shrunk toward (e.g. last season's market ratings); default 0
export function fitRatings(games, { lambda = 2, prior = {} } = {}) {
  const idx = Object.fromEntries(ALL_TEAMS.map((t, i) => [t, i]));
  const n = ALL_TEAMS.length;
  const A = Array.from({ length: n }, () => new Float64Array(n));
  const b = new Float64Array(n);
  let used = 0;
  for (const g of games) {
    const h = idx[g.home], a = idx[g.away];
    if (h == null || a == null || !Number.isFinite(g.margin)) continue;
    const w = g.weight ?? 1, y = g.margin - (g.neutral ? 0 : HFA);
    // residual = r_h − r_a − y ; accumulate normal equations
    A[h][h] += w; A[a][a] += w; A[h][a] -= w; A[a][h] -= w;
    b[h] += w * y; b[a] -= w * y;
    used++;
  }
  for (let i = 0; i < n; i++) { A[i][i] += lambda; b[i] += lambda * (prior[ALL_TEAMS[i]] || 0); }
  // Gaussian elimination
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c || M[r][c] === 0) continue; const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const ratings = {};
  let mean = 0;
  for (let i = 0; i < n; i++) { ratings[ALL_TEAMS[i]] = M[i][n] / M[i][i]; mean += ratings[ALL_TEAMS[i]]; }
  mean /= n;
  for (const t of ALL_TEAMS) ratings[t] = Math.round((ratings[t] - mean) * 10) / 10;
  return { ratings, games: used };
}
