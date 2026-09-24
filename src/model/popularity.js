import { OPP } from "../schedule.js";
import { marketLine } from "./lines.js";
import { availability } from "./field.js";
import { fvFor } from "./value.js";

// P(team) ∝ win^a · exp(-b · futureValue) · availability, over teams with a game that leg.
// a = how hard the field chases the biggest favorite, b = how much it saves high-future-value teams.
export function modelPick(legId, data, params) {
  const { a, b } = params;
  const av = availability(legId, data);
  const sc = {};
  let tot = 0;
  for (const t of Object.keys(OPP[legId])) {
    const ln = marketLine(legId, t, data); if (!ln || ln.win < 0.5) continue;
    const v = Math.pow(ln.win, a) * Math.exp(-b * fvFor(legId, t, data)) * av[t];
    sc[t] = v; tot += v;
  }
  const out = {};
  for (const t of Object.keys(sc)) out[t] = tot > 0 ? sc[t] / tot : 0;
  return out;
}
// Fit a, b to every leg that has both actuals and lines (grid search).
// The miss on each team is weighted by that team's actual share (plus a small floor so ignored teams still
// count a little), because EV depends almost entirely on the few teams the field piles onto.
// A mild penalty holds the knobs near PRIOR while there are only a week or two of actuals. Once several
// weeks accumulate the evidence outweighs it and the knobs go wherever Circa's numbers say.
// The prior stops an early-season fit chasing one odd week. Each knob is measured against a plausible
// SPREAD, not against its own size: dividing by the value itself made any movement in b (which starts near
// 0.15) cost hundreds of times more than the error it saved, so b was frozen rather than restrained. The
// error term sums over legs, so the prior weakens on its own as weeks accumulate.
export const PRIOR = { a: 8, b: 0.15 };
const PRIOR_SPREAD = { a: 6, b: 0.25 };
const PRIOR_WEIGHT = 0.03;
const SHARE_FLOOR = 0.02;
export function fitParams(data) {
  const legs = Object.keys(data.actuals).filter((id) => OPP[id] && Object.keys(OPP[id]).some((t) => marketLine(id, t, data)));
  if (!legs.length) return { ...PRIOR, legs: 0, err: null };
  let best = null;
  for (let a = 2; a <= 24; a += 1) for (let b = 0; b <= 0.8; b += 0.02) {
    let err = 0;
    for (const id of legs) {
      const act = data.actuals[id], tot = Object.values(act.picks).reduce((x, y) => x + y, 0);
      const m = modelPick(id, data, { a, b });
      for (const t of Object.keys(OPP[id])) { const share = (act.picks[t] || 0) / tot; err += (share + SHARE_FLOOR) * Math.abs((m[t] || 0) - share); }
    }
    const penalty = PRIOR_WEIGHT * (((a - PRIOR.a) / PRIOR_SPREAD.a) ** 2 + ((b - PRIOR.b) / PRIOR_SPREAD.b) ** 2);
    const score = err + penalty;
    if (!best || score < best.score) best = { a, b, err, score, legs: legs.length };
  }
  return best;
}
// mean L1 error of the model vs Circa actuals on legs where both exist
export function modelError(data, params) {
  let e = 0, n = 0;
  for (const id of Object.keys(data.actuals)) {
    const act = data.actuals[id], tot = Object.values(act.picks).reduce((x, y) => x + y, 0);
    const m = modelPick(id, data, params); if (!Object.keys(m).length) continue;
    e += Object.keys(OPP[id]).reduce((s, t) => s + Math.abs((m[t] || 0) - (act.picks[t] || 0) / tot), 0); n++;
  }
  return n ? { err: e / n, n } : null;
}
