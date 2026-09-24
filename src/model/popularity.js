import { LEGS, OPP } from "../schedule.js";
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

// The same form fit by likelihood: P(team) ∝ win^a · exp(-b · futureValue) · availability over every team with a market
// line and holders left, favorite or not. a and b maximize the multinomial log-likelihood of Circa's pick counts.
function legFeatures(legId, data) {
  const av = availability(legId, data);
  return Object.keys(OPP[legId]).flatMap((t) => {
    const ln = marketLine(legId, t, data);
    return ln && av[t] > 0 ? [{ team: t, x: [Math.log(ln.win), -fvFor(legId, t, data)], off: Math.log(av[t]) }] : [];
  });
}
function softmax(feats, a, b) {
  const s = feats.map((f) => a * f.x[0] + b * f.x[1] + f.off), m = Math.max(...s);
  const e = s.map((v) => Math.exp(v - m)), z = e.reduce((x, y) => x + y, 0);
  return e.map((v) => v / z);
}
export function likelihoodPick(legId, data, params) {
  const feats = legFeatures(legId, data);
  if (!feats.length) return {};
  const p = softmax(feats, params.a, params.b);
  return Object.fromEntries(feats.map((f, i) => [f.team, p[i]]));
}
// Newton's method on (a, b). se is the square root of the inverse information's diagonal, which treats entries as
// independent and so understates the uncertainty of a field with syndicates.
export function fitLikelihood(data) {
  const legs = Object.keys(data.actuals).filter((id) => OPP[id]).map((id) => {
    const f = legFeatures(id, data);
    return { f, n: f.map((x) => data.actuals[id].picks[x.team] || 0) };
  }).filter((l) => l.f.length >= 2 && l.n.some((n) => n > 0));
  if (!legs.length) return null;
  const evaluate = ([a, b]) => {
    let ll = 0; const g = [0, 0], H = [[0, 0], [0, 0]];
    for (const { f, n } of legs) {
      const p = softmax(f, a, b), N = n.reduce((x, y) => x + y, 0);
      const mean = [0, 1].map((k) => f.reduce((s, x, i) => s + p[i] * x.x[k], 0));
      f.forEach((x, i) => {
        if (n[i]) ll += n[i] * Math.log(p[i]);
        for (let k = 0; k < 2; k++) {
          g[k] += n[i] * x.x[k] - N * p[i] * x.x[k];
          for (let j = 0; j < 2; j++) H[k][j] -= N * p[i] * (x.x[k] - mean[k]) * (x.x[j] - mean[j]);
        }
      });
    }
    return { ll, g, H };
  };
  let th = [PRIOR.a, PRIOR.b], cur = evaluate(th), iterations = 0;
  for (; iterations < 100; iterations++) {
    const [[h11, h12], [, h22]] = cur.H, det = h11 * h22 - h12 * h12;
    let step = [(h22 * cur.g[0] - h12 * cur.g[1]) / det, (h11 * cur.g[1] - h12 * cur.g[0]) / det];
    let next = [th[0] - step[0], th[1] - step[1]], cand = evaluate(next);
    while (cand.ll < cur.ll && Math.abs(step[0]) + Math.abs(step[1]) > 1e-12) {
      step = step.map((v) => v / 2); next = [th[0] - step[0], th[1] - step[1]]; cand = evaluate(next);
    }
    th = next; cur = cand;
    if (Math.abs(step[0]) + Math.abs(step[1]) < 1e-9) break;
  }
  const [[h11, h12], [, h22]] = cur.H, det = h11 * h22 - h12 * h12;
  return { a: th[0], b: th[1], se: { a: Math.sqrt(-h22 / det), b: Math.sqrt(-h11 / det) }, legs: legs.length, loglik: cur.ll, gradient: cur.g, iterations };
}

// Chalk baseline: P(team) ∝ win · availability over every team with a market line.
export function chalkPick(legId, data) {
  const av = availability(legId, data), sc = {};
  for (const t of Object.keys(OPP[legId])) { const ln = marketLine(legId, t, data); if (ln && av[t] > 0) sc[t] = ln.win * av[t]; }
  const tot = Object.values(sc).reduce((x, y) => x + y, 0);
  return Object.fromEntries(Object.entries(sc).map(([t, v]) => [t, v / tot]));
}

// Mean multinomial log loss in nats per entry. Shares are floored and renormalized over the leg's teams, so a model
// that gives a picked team nothing is charged log(1 / SCORE_FLOOR) per such entry instead of infinity.
export const SCORE_FLOOR = 1e-4;
export function multinomialLogLoss(legId, shares, picks) {
  const teams = Object.keys(OPP[legId]);
  const q = Object.fromEntries(teams.map((t) => [t, Math.max(shares[t] || 0, SCORE_FLOOR)]));
  const z = Object.values(q).reduce((x, y) => x + y, 0);
  let loss = 0, N = 0;
  for (const t of teams) { const n = picks[t] || 0; if (n) { loss -= n * Math.log(q[t] / z); N += n; } }
  return N ? loss / N : null;
}

// The three field models' shares for legId, fit only on the legs before it, as recorded before its deadline.
export function predictionRecord(legId, data, madeAt) {
  const idx = LEGS.findIndex((l) => l.id === legId);
  const before = { ...data, actuals: Object.fromEntries(Object.entries(data.actuals).filter(([id]) => LEGS.findIndex((l) => l.id === id) < idx)) };
  const lik = fitLikelihood(before), jam = fitParams(before);
  return {
    legId, deadline: LEGS[idx].deadline, madeAt, oddsAt: data.oddsAt, ratingsAt: data.ratingsAt,
    models: {
      likelihood: { fit: lik && { a: lik.a, b: lik.b, se: lik.se, legs: lik.legs }, shares: lik ? likelihoodPick(legId, before, lik) : {} },
      jamie: { fit: { a: jam.a, b: jam.b, legs: jam.legs }, shares: modelPick(legId, before, jam) },
      chalk: { shares: chalkPick(legId, before) },
    },
  };
}
export const scorePrediction = (record, picks) =>
  Object.fromEntries(Object.entries(record.models).map(([name, m]) => [name, multinomialLogLoss(record.legId, m.shares, picks)]));
