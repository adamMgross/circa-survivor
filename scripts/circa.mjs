// Circa Survivor's published files, parsed. Circa posts a text PDF of every entry's pick after each
// week locks: https://www.circasports.com/wp-content/uploads/YYYY/MM/Circa-Survivor-2026-Week-N-Selections.pdf
// (holiday weeks use a/b suffixes, e.g. 12a = Thanksgiving leg, 12b = the rest of week 12).
import { FULL, LEGS, OPP, norm } from "../src/schedule.js";

// team nickname as Circa prints it → abbreviation
export const NICK = Object.fromEntries(Object.entries(FULL).map(([abbr, name]) => [name.split(" ").pop().toUpperCase(), abbr]));
Object.assign(NICK, { BUCS: "TB", NINERS: "SF", WASHINGTON: "WAS", COMMANDERS: "WAS" });

const SEL = /(\d{1,2})\. ([A-Z0-9]+) PK/g;
const isDate = (s) => /^\d{2}\/\d{2}\/\d{2}$/.test(s);
const isName = (s) => /-\d*$/.test(s);           // every entry name ends in "-<entry number>"; the number is cut off on very long names

// Parse `pdftotext -layout` output of a Selections PDF into { picks: {ABBR: count}, entries: {name: ABBR|null}, noPick: [names] }.
// Each line holds up to three "NAME   NN. TEAM PK" pairs; an entry that made no pick is a name with no selection after it,
// which shows up as two names in the text segment before the next selection.
// Entries that made no pick are simply absent from the file, so the caller derives their count as
// (live entries before the week) − (picks listed). A very long name can push its pick onto the next line;
// a line that starts with a selection belongs to the dangling name at the end of the previous line.
export function parseSelections(text) {
  const entries = {}, picks = {}, unknown = new Set();
  let dangling = null;
  const take = (name, nick) => { const abbr = NICK[nick]; if (!abbr) { unknown.add(nick); return; } entries[name] = abbr; picks[abbr] = (picks[abbr] || 0) + 1; };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim() || /ENTRY NAME|Circa Survivor|Selections/.test(line)) continue;
    let last = 0, m;
    const segs = [];
    SEL.lastIndex = 0;
    while ((m = SEL.exec(line))) { segs.push([line.slice(last, m.index), m[2]]); last = m.index + m[0].length; }
    const tail = line.slice(last).trim();
    for (const [seg, nick] of segs) {
      const names = seg.trim().split(/\s{2,}/).map((s) => s.trim()).filter((s) => s && !isDate(s) && isName(s));
      const own = names.length ? names[names.length - 1] : dangling;    // the name right before the selection owns it
      dangling = null;
      if (own) take(own, nick);
    }
    const tailNames = tail.split(/\s{2,}/).map((s) => s.trim()).filter((s) => s && !isDate(s) && isName(s));
    dangling = tailNames.length ? tailNames[tailNames.length - 1] : null;
  }
  return { picks, entries, unknown: [...unknown], total: Object.values(picks).reduce((a, b) => a + b, 0) };
}

// Circa's file name variants for a leg. Thanksgiving/Christmas legs share an NFL week with a regular leg (a = holiday games, b = the rest).
export function selectionFileNames(legId) {
  const label = legId === "TG" ? ["12a"] : legId === "W12" ? ["12b", "12"] : legId === "XM" ? ["16a"] : legId === "W16" ? ["16b", "16"] : [legId.slice(1)];
  const leg = LEGS.find((l) => l.id === legId);
  const d = new Date(leg.start + "T12:00:00Z");
  const months = [0, 1].map((k) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1)); return `${x.getUTCFullYear()}/${String(x.getUTCMonth() + 1).padStart(2, "0")}`; });
  const out = [];
  for (const mm of months) for (const lb of label) for (const suf of ["", "_1"]) out.push(`https://www.circasports.com/wp-content/uploads/${mm}/Circa-Survivor-2026-Week-${lb}-Selections${suf}.pdf`);
  return out;
}

// ESPN's free scoreboard → results for the leg's games: { ABBR: "won" | "lost" | "pending" }. A tie counts as a loss (Circa rule).
export const espnWeek = (legId) => (legId === "TG" ? 12 : legId === "XM" ? 16 : Number(legId.slice(1)));
export function resultsFromScoreboard(legId, scoreboard) {
  const out = {};
  for (const ev of scoreboard.events || []) {
    const comp = ev.competitions?.[0]; if (!comp) continue;
    const home = comp.competitors.find((c) => c.homeAway === "home"), away = comp.competitors.find((c) => c.homeAway === "away");
    const h = norm(home?.team?.abbreviation), a = norm(away?.team?.abbreviation);
    if (!h || !a || !OPP[legId][a] || OPP[legId][a].opp !== h) continue;          // not one of this leg's games
    const done = comp.status?.type?.completed === true;
    if (!done) { out[h] = "pending"; out[a] = "pending"; continue; }
    const hs = Number(home.score), as = Number(away.score);
    out[h] = hs > as ? "won" : "lost"; out[a] = as > hs ? "won" : "lost";
  }
  return out;
}
