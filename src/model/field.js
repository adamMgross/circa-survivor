import { LEGS, ALL_TEAMS } from "../schedule.js";

// The week to open on. A week stays current while its games are still being played, so Saturday's lock
// (which is when Circa posts picks, and therefore when a week first gets an actuals entry) does not jump
// you forward before a single game has kicked off. `pending` empties as ESPN reports finals, so the switch
// happens after the last game of the week. If a result never lands, the next week's start unsticks it.
export function openLeg(actualLegs, now = Date.now()) {
  for (let i = 0; i < LEGS.length; i++) {
    const l = LEGS[i], a = actualLegs?.[l.id];
    if (!a) return l.id;                                  // not locked yet: this is the week being planned
    if (!a.pending?.length) continue;                     // week is final, move on
    const next = LEGS[i + 1];
    if (!next || new Date(next.start + "T00:00:00-04:00").getTime() > now) return l.id;   // games still running
  }
  return LEGS[LEGS.length - 1].id;
}

// derived per-leg field math, in leg order
export function fieldTimeline(data) {
  const { contest, actuals } = data;
  let live = contest.start;
  const out = [];
  for (const l of LEGS) {
    const a = actuals[l.id]; if (!a) break;
    const lost = Object.entries(a.picks).filter(([t]) => a.lost.includes(t)).reduce((s, [, n]) => s + n, 0);
    const pend = Object.entries(a.picks).filter(([t]) => a.pending.includes(t)).reduce((s, [, n]) => s + n, 0);
    const before = live; live = before - lost;
    out.push({ leg: l, before, lost, pending: pend, after: live, value: contest.pool / live });
  }
  return out;
}

// Entries alive going into legId.
export function fieldSize(legId, data) {
  const idx = LEGS.findIndex((l) => l.id === legId);
  const tl = fieldTimeline(data);
  return idx < tl.length ? tl[idx].before : (tl.length ? tl[tl.length - 1].after : data.contest.start);
}
// share of the field still holding each team going into legId, from actual picks in earlier legs
export function availability(legId, data) {
  const idx = LEGS.findIndex((l) => l.id === legId);
  const tl = fieldTimeline(data);
  const burned = {};
  for (let k = 0; k < Math.min(idx, tl.length); k++) {
    const r = tl[k], a = data.actuals[r.leg.id];
    let survive = 1;
    for (let j = k + 1; j < Math.min(idx, tl.length); j++) survive *= tl[j].after / tl[j].before;
    for (const [t, n] of Object.entries(a.picks)) if (a.won.includes(t)) burned[t] = (burned[t] || 0) + n * survive;
  }
  const live = idx < tl.length ? tl[idx].before : (tl.length ? tl[tl.length - 1].after : data.contest.start);
  const out = {};
  for (const t of ALL_TEAMS) out[t] = Math.max(0, 1 - (burned[t] || 0) / (live || 1));
  return out;
}

// An entry is out the moment one of its picks loses, or when a finished week went by with no pick at all.
// A week with games still pending cannot eliminate anyone who has not already lost.
export function entryStatus(entry, actualLegs) {
  for (const l of LEGS) {
    const a = actualLegs?.[l.id]; if (!a) break;
    const t = entry.picks?.[l.id];
    if (t && a.lost.includes(t)) return { alive: false, leg: l };
    if (!t && !a.pending?.length) return { alive: false, leg: l };
  }
  return { alive: true, leg: null };
}
