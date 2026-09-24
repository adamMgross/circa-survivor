// The field model fit by likelihood, its baselines, the log-loss score, and the pre-deadline prediction record.
import fx from "./fixtures/w1w2.json";
import { OPP } from "../src/schedule.js";
import { buildData, marketLine } from "../src/model/lines.js";
import { fitLikelihood, likelihoodPick, modelPick, fitParams, chalkPick, multinomialLogLoss, predictionRecord, scorePrediction, SCORE_FLOOR } from "../src/model/popularity.js";
let fails = 0; const ok = (name, cond, extra = "") => { console.log(name + ":", cond ? "OK" : "FAIL", extra); if (!cond) fails++; };
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

const data = buildData({ picks: { entries: [] }, actuals: fx.actuals, odds: { ...fx.odds, updatedAt: fx.oddsUpdatedAt }, ratings: fx.ratings });
const withPicks = (d, leg, picks) => ({ ...d, actuals: { ...d.actuals, [leg]: { ...d.actuals[leg], picks } } });
const counts = (shares, N) => Object.fromEntries(Object.entries(shares).map(([t, p]) => [t, Math.round(p * N)]));
const truth = { a: 9, b: 0.2 };
const d1 = withPicks(data, "W1", counts(likelihoodPick("W1", data, truth), 1e7));
const d2 = withPicks(d1, "W2", counts(likelihoodPick("W2", d1, truth), 1e7));
const rec = fitLikelihood(d2);
ok("the fit recovers the parameters that generated the counts", Math.abs(rec.a - truth.a) < 0.01 && Math.abs(rec.b - truth.b) < 0.001, `a ${rec.a.toFixed(4)} b ${rec.b.toFixed(5)}`);

const fit = fitLikelihood(data);
ok("the fit on Circa's Weeks 1 and 2 is a stationary point of the likelihood", Math.abs(fit.gradient[0]) < 1e-6 && Math.abs(fit.gradient[1]) < 1e-6 && fit.legs === 2, JSON.stringify(fit.gradient));
ok("standard errors are finite and positive", fit.se.a > 0 && fit.se.b > 0 && Number.isFinite(fit.se.a + fit.se.b));
const lik2 = likelihoodPick("W2", data, fit), jam2 = modelPick("W2", data, fitParams(data));
const dogs = Object.keys(OPP.W2).filter((t) => marketLine("W2", t, data)?.win < 0.5);
ok("underdogs get a share under the likelihood model and none under the grid model", dogs.length > 0 && dogs.every((t) => lik2[t] > 0 && !jam2[t]), `${dogs.length} underdogs`);
ok("every model's shares sum to 1", [lik2, jam2, chalkPick("W2", data)].every((s) => Math.abs(sum(s) - 1) < 1e-9));

const picks = fx.actuals.legs.W2.picks, N = sum(picks);
const empirical = Object.fromEntries(Object.entries(picks).map(([t, n]) => [t, n / N]));
const best = multinomialLogLoss("W2", empirical, picks);
ok("the log loss is proper: the empirical shares beat every model", [lik2, jam2, chalkPick("W2", data)].every((s) => multinomialLogLoss("W2", s, picks) > best));
const zeroed = { ...empirical, [Object.keys(picks)[0]]: 0 };
ok("a picked team given nothing costs a finite floor, not infinity", Number.isFinite(multinomialLogLoss("W2", zeroed, picks)) && multinomialLogLoss("W2", zeroed, picks) > best && SCORE_FLOOR > 0);

const r = predictionRecord("W2", data, "2026-09-19T22:17:00Z");
const altered = predictionRecord("W2", withPicks(data, "W2", { KC: 1 }), "2026-09-19T22:17:00Z");
ok("a week's prediction does not see that week's picks", JSON.stringify(r) === JSON.stringify(altered) && r.models.likelihood.fit.legs === 1 && r.models.jamie.fit.legs === 1);
ok("the record carries all three models", ["likelihood", "jamie", "chalk"].every((m) => Math.abs(sum(r.models[m].shares) - 1) < 1e-9) && r.deadline && r.oddsAt);
const s = scorePrediction(r, picks);
ok("a record scores every model", ["likelihood", "jamie", "chalk"].every((m) => Number.isFinite(s[m])), JSON.stringify(s));
ok("Week 1 has no earlier week, so only chalk predicts it", predictionRecord("W1", data, "x").models.likelihood.fit === null && Object.keys(predictionRecord("W1", data, "x").models.chalk.shares).length > 0);

if (fails) { console.error(`\n${fails} FAILED`); process.exit(1); }
