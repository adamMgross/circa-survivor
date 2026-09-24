import { useState, useEffect, useMemo, useRef } from "react";
import { LEGS, ALL_TEAMS, OPP, TG_TEAMS, XM_TEAMS, legLabel } from "./schedule.js";
import { REPO, readFile, writeFile, whoAmI, dispatchWorkflow } from "./github.js";
import { BOOK_NAME, STATUS_TEXT, buildData, lineFor } from "./model/lines.js";
import { openLeg, entryStatus, fieldTimeline, availability } from "./model/field.js";
import { EV_MIN_COVERAGE, SURVIVE, gauntletFeasible } from "./model/value.js";
import { PRIOR, modelPick, fitParams, modelError } from "./model/popularity.js";
import { boardStats } from "./model/board.js";
// Bundled copies of the data files (built into the site on every deploy). The page also re-reads the
// live files from the repo on load so viewers see saves made since the last deploy.
import picksBundled from "../data/picks.json";
import actualsBundled from "../data/actuals.json";
import oddsBundled from "../data/odds.json";
import ratingsBundled from "../data/ratings.json";

const VERSION = "2.0";
const TOKEN_KEY = "csp-github-token";
const PATHS = { picks: "data/picks.json", actuals: "data/actuals.json", odds: "data/odds.json", ratings: "data/ratings.json" };
const BUNDLED = { picks: picksBundled, actuals: actualsBundled, odds: oddsBundled, ratings: ratingsBundled };

// team cell colors: [background, text]
const COLORS = {
  ARI: ["#97233F", "#FFB612"], ATL: ["#A71930", "#FFFFFF"], BAL: ["#241773", "#9E7C0C"], BUF: ["#00338D", "#C60C30"],
  CAR: ["#0085CA", "#101820"], CHI: ["#0B162A", "#C83803"], CIN: ["#FB4F14", "#000000"], CLE: ["#311D00", "#FF3C00"],
  DAL: ["#003594", "#B0B7BC"], DEN: ["#FB4F14", "#002244"], DET: ["#0076B6", "#B0B7BC"], GB: ["#203731", "#FFB612"],
  HOU: ["#03202F", "#A71930"], IND: ["#002C5F", "#FFFFFF"], JAX: ["#006778", "#D7A22A"], KC: ["#E31837", "#FFB81C"],
  LAC: ["#0080C6", "#FFC20E"], LV: ["#000000", "#A5ACAF"], LAR: ["#003594", "#FFA300"], MIA: ["#008E97", "#FC4C02"],
  MIN: ["#4F2683", "#FFC62F"], NE: ["#002244", "#B0B7BC"], NO: ["#D3BC8D", "#101820"], NYG: ["#0B2265", "#FFFFFF"],
  NYJ: ["#125740", "#FFFFFF"], PHI: ["#004C54", "#A5ACAF"], PIT: ["#FFB612", "#101820"], SF: ["#AA0000", "#B3995D"],
  SEA: ["#002244", "#69BE28"], TB: ["#D50A0A", "#FFFFFF"], TEN: ["#0C2340", "#4B92DB"], WAS: ["#5A1414", "#FFB612"],
};

function defaultLeg() {
  const now = Date.now();
  for (let i = 0; i < LEGS.length; i++) {
    const nxt = LEGS[i + 1];
    if (!nxt || new Date(nxt.start + "T12:00:00").getTime() > now) return LEGS[i].id;
  }
  return "W18";
}

const CSS = `
/* ---- tokens: paper, ink, one green ---- */
.csp { --paper:#FBFAF7; --panel:#F4F2EC; --surface:#FFFFFF; --ink:#17181C; --ink2:#5B5E66; --ink3:#9A9DA6; --rule:#E7E5DF; --rule2:#D6D3CB;
  --green:#2F8F3E; --green-ink:#1C5E2A; --green-bg:#DDF3DC; --sand:#F3EFE3; --sand-ink:#7A5A12; --amber:#C98A1A; --red:#D64545;
  --sel:#2F63C9; --sel-line:#9DB8E6; --sel-bg:#EAF0FA; --sel-bg2:#DCE6F6; --sel-bg3:#CFDCF2;
  --th:40px; --rh:34px; --cw:52px; --gap:20px;
  display:flex; flex-direction:column; height:100vh; background:var(--paper); color:var(--ink);
  font-family:"IBM Plex Sans", -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; font-size:13px; font-variant-numeric:tabular-nums; -webkit-font-smoothing:antialiased; }
.csp * { box-sizing:border-box; }
.csp h1 { font-size:20px; font-weight:600; letter-spacing:-0.01em; margin:0; display:flex; align-items:center; gap:14px; white-space:nowrap; }
.csp h1 .ver { font-size:11px; font-weight:400; color:var(--ink3); }

/* ---- top bar ---- */
.csp .bar { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:12px 16px 10px; }
.csp .bar .left { display:flex; align-items:center; gap:18px; min-width:0; flex-wrap:wrap; }
.csp .ctl { display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0; }
.csp .ctl .row { display:flex; gap:8px; align-items:center; min-height:32px; }
.csp .ctl .note { font-size:12px; color:var(--ink3); padding-right:6px; }
.csp .ctl .note.msg { color:var(--ink); }
.csp .ctl .note.err { color:var(--red); }
.csp .who { font-size:12px; color:var(--ink2); }
.csp .link { display:inline-block; background:none; border:none; padding:0 4px; font:inherit; font-size:12px; color:var(--ink2); cursor:pointer; text-decoration:underline; text-underline-offset:3px; }
.csp .link:hover { color:var(--ink); }

/* one control system */
.csp .btn, .csp .ghost, .csp .ctl select { height:32px; line-height:30px; padding:0 12px; font:inherit; font-size:13px; font-weight:500; border-radius:8px; border:1px solid var(--rule2); background:var(--surface); color:var(--ink); cursor:pointer; white-space:nowrap; }
.csp .btn:hover, .csp .ghost:hover, .csp .ctl select:hover { border-color:var(--ink3); }
.csp .btn:focus-visible, .csp .ghost:focus-visible, .csp .ctl select:focus-visible, .csp .seg button:focus-visible, .csp .views button:focus-visible { outline:2px solid var(--ink); outline-offset:2px; }
.csp .btn { background:var(--ink); color:#fff; border-color:var(--ink); }
.csp .btn:hover { background:#2a2c33; border-color:#2a2c33; }
.csp .btn:disabled, .csp .ghost:disabled { opacity:.45; cursor:default; }
.csp .ghost.on { background:var(--panel); border-color:var(--ink3); }
.csp .ctl select { appearance:none; -webkit-appearance:none; font-weight:600; padding-right:30px; background:var(--surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5l3.5 3.5 3.5-3.5' fill='none' stroke='%2317181C' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center; }
/* segmented controls: views and entries */
.csp .views, .csp .seg { display:inline-flex; padding:3px; background:var(--panel); border-radius:9px; gap:2px; }
.csp .views button, .csp .seg button { height:26px; line-height:26px; padding:0 12px; font:inherit; font-size:13px; font-weight:500; border:none; border-radius:6px; background:transparent; color:var(--ink2); cursor:pointer; white-space:nowrap; }
.csp .views button:hover, .csp .seg button:hover { color:var(--ink); }
.csp .views button.on, .csp .seg button.on { background:var(--surface); color:var(--ink); box-shadow:0 1px 2px rgba(0,0,0,.10); }
.csp .seg button .n { margin-left:6px; font-size:11px; color:var(--ink3); font-weight:400; }
.csp .seg button.on .n { color:var(--ink2); }

/* ---- the board ---- */
.csp .wrap { flex:1; min-height:0; overflow:auto; background:var(--surface); border-top:1px solid var(--rule); }
.csp table { border-collapse:separate; border-spacing:0; font-size:12px; }
.csp th, .csp td { padding:0; border-bottom:1px solid var(--rule); white-space:nowrap; }
.csp th { position:sticky; top:0; z-index:3; height:var(--th); background:var(--paper); color:var(--ink2); font-weight:500; font-size:12px; text-align:center; vertical-align:middle; line-height:1.15; cursor:pointer; user-select:none; border-bottom:1px solid var(--rule2); }
.csp th:hover { color:var(--ink); }
.csp th .lsub { display:block; font-weight:400; font-size:10px; color:var(--ink3); margin-top:1px; }
.csp th.sorted { color:var(--ink); font-weight:600; box-shadow:inset 0 -2px 0 var(--ink); }
.csp th.hol { color:var(--sand-ink); }
.csp th.hol .lsub { color:var(--sand-ink); opacity:.8; }
.csp .wrap.scrolled tr.top th { box-shadow:0 4px 10px rgba(23,24,28,.06); }
/* selected week: a blue wash down the column inside a soft blue frame (real borders, so it never breaks) */
.csp th.curcol { background:var(--sel-bg) !important; color:var(--sel); font-weight:600; border-left:2px solid var(--sel-line); border-right:2px solid var(--sel-line); }
.csp .sum tr.top th.curcol { border-top:2px solid var(--sel-line); }
.csp td.curcol { background:var(--sel-bg); border-left:2px solid var(--sel-line); border-right:2px solid var(--sel-line); }
.csp td.curcol.last { border-bottom:2px solid var(--sel-line); }
.csp .sum td.curcol { background:var(--sel-bg2); }
.csp .sum tr.gap td.curcol { background:var(--sel-bg); border-bottom-color:var(--rule); }

/* frozen left block: EV | W% | P% | Team */
.csp .L { position:sticky; z-index:2; background:var(--surface); height:var(--rh); text-align:center; }
/* frozen block: what we observe (W%, P%, Future) then what we conclude (EV, exact EV, DILI); 418px total */
.csp .L.wp { left:0; width:70px; min-width:70px; }
.csp .L.pp { left:70px; width:66px; min-width:66px; }
.csp .L.fv { left:136px; width:66px; min-width:66px; }
.csp .L.ev { left:202px; width:70px; min-width:70px; }
.csp .L.evx { left:272px; width:70px; min-width:70px; }
.csp .L.dili { left:342px; width:76px; min-width:76px; }
.csp .L.team { left:418px; width:var(--teamw,100px); min-width:var(--teamw,100px); text-align:left; padding:0 8px 0 12px; font-weight:600; }
.csp .L.pctl { left:0; width:418px; min-width:418px; padding:0; }
.csp .sum td.pctl { top:0; height:calc(var(--th) + var(--n) * var(--rh)); border-bottom:1px solid var(--rule); }
/* the board's controls: a plain block pinned over the table's top-left corner, laid out on its own terms */
.csp .corner { position:sticky; top:0; left:0; height:0; z-index:7; }
.csp .controls { position:absolute; left:0; top:0; width:418px; height:calc(var(--th) + var(--n) * var(--rh)); box-sizing:border-box; padding:0 12px 0 16px; background:var(--panel); border-bottom:1px solid var(--rule); display:flex; flex-direction:column; justify-content:center; gap:10px; }
.csp .controls .row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.csp .sum tr.top th { background:var(--panel); }

.csp .controls select { height:28px; line-height:26px; padding:0 28px 0 10px; font:inherit; font-size:13px; font-weight:600; border-radius:7px; border:1px solid var(--rule2); color:var(--ink); cursor:pointer; appearance:none; -webkit-appearance:none; background:var(--surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5l3.5 3.5 3.5-3.5' fill='none' stroke='%2317181C' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 9px center; }
.csp .controls select:hover { border-color:var(--ink3); }
.csp .controls .btn, .csp .controls .ghost { height:28px; line-height:26px; padding:0 11px; border-radius:7px; }
.csp .controls .note { font-size:11px; color:var(--ink3); white-space:normal; line-height:1.3; max-width:180px; }
.csp .controls .note.msg { color:var(--ink); }
.csp .controls .note.err { color:var(--red); }
.csp .L.entry { left:418px; width:var(--teamw,116px); min-width:var(--teamw,116px); text-align:right; padding:0 10px 0 0; }
.csp td.L.dili.num { color:var(--ink); font-weight:600; }
.csp td.L.num .v { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); align-items:center; height:100%; }
.csp td.L.num .v .n { grid-column:2; }
.csp td.L.num .d { grid-column:3; justify-self:start; width:0; overflow:visible; white-space:nowrap; padding-left:3px; font-size:9px; font-weight:500; letter-spacing:-0.01em; line-height:1; }
.csp td.L.num .d.up { color:var(--green-ink); }
.csp td.L.num .d.down { color:var(--red); }
.csp th.L { z-index:4; background:var(--paper); }
.csp th.L.team { text-align:left; padding-left:12px; }
.csp th.L.entry { cursor:default; }
.csp td.L.num { color:var(--ink2); }
.csp td.L.num.blank { color:var(--ink3); }
.csp td.L.ev.num, .csp td.L.evx.num { color:var(--ink); font-weight:600; }
/* highlights: green on the best five EV / W% / DILI and on a cheap Future; red on a crowded P% */
.csp td.L.num.hi { color:var(--green-ink); }
.csp td.L.num.warn { color:var(--red); }
.csp td.L.num.weak .n::after { content:""; display:inline-block; width:5px; height:5px; border-radius:50%; background:var(--amber); margin-left:4px; vertical-align:2px; }
.csp .team { box-shadow:inset 3px 0 0 var(--tc); }
.csp .team .hd { display:inline-block; width:6px; height:6px; border-radius:50%; margin-left:5px; vertical-align:1px; background:var(--sand-ink); opacity:.7; }
.csp .team .hd.x { background:var(--red); }
.csp .team .used { font-weight:400; color:var(--ink3); font-size:10px; margin-left:6px; }
.csp tr.gone .team .nm { text-decoration:line-through; color:var(--ink3); }
.csp tr.gone .team { box-shadow:inset 3px 0 0 var(--rule2); }

/* week cells: one line, favorite strength as a faint tint */
.csp td.c { width:var(--cw); min-width:var(--cw); height:var(--rh); text-align:center; position:relative; cursor:pointer; user-select:none; color:var(--ink); background:rgba(47,143,62,var(--fav,0)); line-height:1.1; padding-top:1px; }
.csp.ro td.c { cursor:default; }
.csp td.c .sp { display:block; color:var(--ink2); font-size:10px; margin-top:2px; }
.csp td.c .sp.proj { color:var(--ink3); font-style:italic; }
.csp td.c.away { color:var(--ink2); }
.csp td.c.bye { background:var(--panel); cursor:default; }
.csp td.c.dead { color:var(--ink3); text-decoration:line-through; cursor:not-allowed; }
.csp td.c.dead .sp, .csp td.c.dim .sp { color:var(--ink3); text-decoration:none; }
.csp td.c.dim { color:var(--ink3); }
.csp td.c.pick { background:var(--green-bg); color:var(--green-ink); font-weight:600; text-decoration:none; }
.csp td.c.pick .sp { color:var(--green-ink); }
.csp:not(.ro) td.c:not(.bye):not(.dead):hover { box-shadow:inset 0 0 0 2px var(--ink); }
.csp td.c .oth { position:absolute; top:2px; right:4px; font-size:9px; color:var(--ink3); letter-spacing:1px; }
.csp td.c.pick .oth { color:var(--green-ink); }


/* entries panel on top of the board */
.csp .sum td { position:sticky; top:var(--top); z-index:2; background:var(--panel); height:var(--rh); text-align:center; font-weight:500; border-bottom-color:var(--rule); }
.csp .sum td.L { z-index:5; background:var(--panel); }
.csp .sum td.entry { color:var(--ink2); font-weight:500; }
/* an eliminated entry: struck through and faded, still selectable so its history stays readable */
.csp .seg button.out .nm { text-decoration:line-through; text-decoration-thickness:1px; opacity:.6; }
.csp .seg button.out .n { color:var(--red); opacity:.85; }
.csp .sum tr.out td { opacity:.5; }
.csp .sum tr.out td.entry .nm { text-decoration:line-through; text-decoration-thickness:1px; }
.csp .sum tr.out.sel td { opacity:.62; }
.csp .sum td.entry .tag { margin-left:7px; font-size:10px; font-weight:500; color:var(--red); letter-spacing:.01em; }
/* selected entry: the same wash across the row inside a soft blue frame */
.csp .sum tr.sel td { background:var(--sel-bg); border-top:2px solid var(--sel-line); border-bottom:2px solid var(--sel-line); }
.csp .sum tr.sel td.entry { color:var(--ink); font-weight:600; border-left:2px solid var(--sel-line); }
.csp .sum tr.sel td.s:last-child { border-right:2px solid var(--sel-line); }
.csp .sum tr.sel td.curcol { background:var(--sel-bg3); }
.csp .sum tr:has(+ tr.sel) td, .csp .sum tr:has(+ tr.sel) th { border-bottom-color:transparent; }
.csp .sum td.s { width:var(--cw); min-width:var(--cw); }
.csp .sum td.s .chip { display:inline-block; min-width:38px; padding:2px 5px; border-radius:5px; font-size:11px; font-weight:600; line-height:16px; }
.csp .sum td.empty { color:var(--rule2); font-weight:400; }
.csp .sum tr.gap td { height:var(--gap); background:var(--paper); cursor:default; position:sticky; top:calc(var(--th) + var(--n) * var(--rh)); z-index:4; border-bottom:1px solid var(--rule); }
.csp .sum tr.hdr2 th { top:calc(var(--th) + var(--n) * var(--rh) + var(--gap)); }
.csp .sum tr.hdr2 th.L { z-index:5; }
.csp .sum tr.top th, .csp .sum tr.top td { border-top:none; }

/* ---- panels: sign-in, audit, editors ---- */
.csp .panel { background:var(--surface); border-top:1px solid var(--rule); border-bottom:1px solid var(--rule); padding:12px 16px; }
.csp .panel .f { font-size:12px; color:var(--ink2); margin-bottom:8px; line-height:1.5; max-width:72ch; }
.csp .panel .f b { color:var(--ink); font-weight:600; }
.csp .panel .f code, .csp .audit .f code { background:var(--panel); padding:1px 5px; border-radius:4px; font-family:inherit; }
.csp .panel input[type=text], .csp .panel input[type=password], .csp .panel input[type=number] { height:32px; font:inherit; font-size:13px; padding:0 10px; border:1px solid var(--rule2); border-radius:8px; background:var(--surface); }
.csp .panel .row { display:flex; gap:8px; margin-top:6px; align-items:center; flex-wrap:wrap; }
.csp .audit { background:var(--surface); border-top:1px solid var(--rule); border-bottom:1px solid var(--rule); padding:14px 16px 16px; max-height:52vh; overflow:auto; }
.csp .audit .secs { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:10px 32px; margin-bottom:6px; }
.csp .audit .sec p { font-size:12px; color:var(--ink2); line-height:1.5; margin:0 0 6px; max-width:60ch; }
.csp .audit .sec p b { color:var(--ink); font-weight:600; }
.csp .audit .sec code { background:var(--panel); padding:1px 5px; border-radius:4px; font-family:inherit; }
.csp .audit h4 { font-size:12px; font-weight:600; color:var(--ink); margin:0 0 4px; }
.csp .audit h4.th { margin:14px 0 6px; }
.csp .audit .sec .row { display:flex; align-items:center; gap:10px; margin-top:4px; }
.csp .audit .sec .lbl { font-size:12px; color:var(--ink2); }
.csp .audit .seg button { height:24px; line-height:24px; padding:0 10px; font-size:12px; }
.csp .audit table { border-collapse:collapse; font-size:12px; }
.csp .audit th { position:static; height:auto; padding:6px 10px; background:transparent; color:var(--ink2); font-size:11px; font-weight:500; text-align:right; border:none; border-bottom:1px solid var(--rule2); cursor:default; }
.csp .audit td { padding:0 10px; height:26px; text-align:right; border:none; border-bottom:1px solid var(--rule); color:var(--ink2); }
.csp .audit th:first-child, .csp .audit td:first-child { text-align:left; font-weight:600; color:var(--ink); }
.csp .audit td.fin { font-weight:600; color:var(--ink); }
.csp .audit td.mut { color:var(--ink3); }

/* ---- actuals ---- */
.csp .act { flex:1; min-height:0; overflow:auto; padding:4px 16px 24px; border-top:1px solid var(--rule); background:var(--surface); }
.csp .strip { display:flex; align-items:stretch; gap:0; margin:10px 0 18px; flex-wrap:wrap; }
.csp .strip .fig { padding:6px 28px 6px 0; margin-right:28px; border-right:1px solid var(--rule); }
.csp .strip .fig:last-child { border-right:none; }
.csp .strip .v { font-size:24px; font-weight:600; letter-spacing:-0.01em; line-height:1.1; }
.csp .strip .v.up { color:var(--green-ink); }
.csp .strip .k { font-size:12px; color:var(--ink2); margin-top:3px; }
.csp .strip .actions { display:flex; flex-direction:column; gap:6px; justify-content:center; margin-left:auto; }
.csp .legcard { border:1px solid var(--rule); border-radius:10px; margin-bottom:16px; overflow:hidden; }
.csp .legcard .hd2 { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:10px 14px; background:var(--paper); border-bottom:1px solid var(--rule); }
.csp .legcard .hd2 .legsel { height:32px; font:inherit; font-size:13px; font-weight:600; color:var(--ink); border:1px solid var(--rule2); border-radius:8px; padding:0 30px 0 12px; cursor:pointer; appearance:none; -webkit-appearance:none; background:var(--surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5l3.5 3.5 3.5-3.5' fill='none' stroke='%2317181C' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center; }
.csp .legcard .hd2 .legsel:hover { border-color:var(--ink3); }
.csp .legcard .hd2 .m { font-size:12px; color:var(--ink2); }
.csp .legcard .hd2 .m b { color:var(--ink); font-weight:600; }
.csp .dist { width:100%; border-collapse:collapse; font-size:12px; }
.csp .dist th { position:static; height:auto; background:transparent; color:var(--ink2); font-size:11px; font-weight:500; padding:8px 12px; text-align:right; border:none; border-bottom:1px solid var(--rule2); cursor:default; }
.csp .dist th:first-child, .csp .dist td:first-child { text-align:left; }
.csp .dist td { padding:0 12px; height:30px; text-align:right; border:none; border-bottom:1px solid var(--rule); color:var(--ink2); }
.csp .dist td:nth-child(2) { color:var(--ink); font-weight:500; }
.csp .dist .chip { display:inline-block; min-width:44px; text-align:center; padding:3px 7px; border-radius:5px; font-weight:600; font-size:11px; }
.csp .dist .bar { display:inline-block; height:6px; border-radius:3px; vertical-align:middle; background:var(--green); opacity:.55; }
.csp .dist tr.L .bar { background:var(--red); }
.csp .dist tr.P .bar { background:var(--amber); }
.csp .dist .res { font-weight:600; }
.csp .dist tr.W .res { color:var(--green-ink); }
.csp .dist tr.L .res { color:var(--red); }
.csp .dist tr.P .res { color:var(--amber); }
.csp .dist .elim { color:var(--red); }
.csp .chart { border:1px solid var(--rule); border-radius:10px; padding:12px 14px; margin-bottom:16px; flex:0 1 440px; max-width:480px; }
.csp .chart h3 { font-size:12px; color:var(--ink2); margin:0 0 4px; font-weight:500; }
.csp .editor { border:1px solid var(--rule); border-radius:10px; margin-bottom:16px; padding:12px 16px; }
.csp .editor h3 { font-size:14px; font-weight:600; margin:0 0 10px; }
.csp .editor .row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:10px; font-size:12px; color:var(--ink2); }
.csp .editor label { display:flex; gap:6px; align-items:center; color:var(--ink2); }
.csp .editor input, .csp .editor select { height:28px; font:inherit; font-size:12px; padding:0 8px; border:1px solid var(--rule2); border-radius:6px; background:var(--surface); color:var(--ink); }
.csp .editor input.num { width:84px; text-align:right; }
.csp .editor .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:6px 16px; margin:8px 0 12px; }
.csp .editor .grid .g { display:flex; gap:6px; align-items:center; font-size:12px; }
.csp .editor .grid .g .chip { display:inline-block; min-width:44px; text-align:center; padding:3px 6px; border-radius:5px; font-weight:600; font-size:11px; }
@media (prefers-reduced-motion: no-preference) { .csp .btn, .csp .ghost, .csp .views button, .csp .seg button { transition:background .12s, border-color .12s, color .12s; } }
`;

const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null);

export default function CircaSurvivorPlanner() {
  const [files, setFiles] = useState(() => Object.fromEntries(Object.keys(PATHS).map((k) => [k, { json: BUNDLED[k], sha: null }])));
  const filesRef = useRef(files); filesRef.current = files;
  const [token, setToken] = useState(() => { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } });
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [statusErr, setStatusErr] = useState(false);
  const [active, setActive] = useState(0);
  const [legId, setLegId] = useState(defaultLeg());
  const [sort, setSort] = useState({ key: "dili", dir: 1 }); // key: dili|ev|wp|pp|team|fv|<legId>
  const [style, setStyle] = useState(() => { try { return localStorage.getItem("csp-style") || "future"; } catch { return "future"; } });
  const pickStyle = (v) => { setStyle(v); try { localStorage.setItem("csp-style", v); } catch {} };
  const [view, setView] = useState("planner");
  const [audit, setAudit] = useState(false);
  const [signin, setSignin] = useState(false);
  const [tokenDraft, setTokenDraft] = useState("");
  const [updating, setUpdating] = useState(false);
  const sayTimer = useRef(null);
  const say = (msg, err = false) => {
    setStatus(msg); setStatusErr(err);
    clearTimeout(sayTimer.current);
    if (msg && !err && !/…$/.test(msg)) sayTimer.current = setTimeout(() => setStatus(""), 4000);   // "Saving…"-style messages stay until replaced
  };

  // read the live data files from the repo (falls back to the copies bundled at deploy time)
  const loadAll = async (tok) => {
    const next = {}; let failed = 0;
    await Promise.all(Object.entries(PATHS).map(async ([k, p]) => {
      try { next[k] = await readFile(p, tok); } catch (e) { failed++; }
    }));
    setFiles((prev) => ({ ...prev, ...next }));
    if (failed) say(failed === Object.keys(PATHS).length ? "Showing data from the last deploy (GitHub API unavailable)" : "Some files could not be re-read from GitHub", false);
    return failed;
  };
  useEffect(() => { (async () => { await loadAll(token); setLoaded(true); })(); }, []); // eslint-disable-line
  // once data is in, open on the first week whose results are not final yet
  const jumped = useRef(false);
  useEffect(() => {
    if (!loaded || jumped.current) return; jumped.current = true;
    const open = openLeg(files.actuals.json?.legs);
    if (open !== legId) setLegId(open);
  }, [loaded]); // eslint-disable-line
  useEffect(() => {
    if (!token) { setUser(null); return; }
    let live = true;
    whoAmI(token).then((login) => { if (live) { setUser(login); say(""); } })
      .catch((e) => { if (live) { setUser(null); say("GitHub token rejected: " + e.message, true); } });
    return () => { live = false; };
  }, [token]);

  const data = useMemo(() => buildData({ picks: files.picks.json, actuals: files.actuals.json, odds: files.odds.json, ratings: files.ratings.json }), [files]);
  const entries = data.entries;
  const canEdit = !!user;

  // ---- saving to the repo ----
  const saveTimer = useRef(null);
  const save = async (kind, message) => {
    const f = filesRef.current[kind];
    say("Saving to GitHub…");
    try {
      const sha = await writeFile(PATHS[kind], f.json, f.sha, token, message);
      setFiles((prev) => ({ ...prev, [kind]: { ...prev[kind], sha } }));
      say(`Saved ${fmtTime(new Date().toISOString())}`);
    } catch (e) { say("Save failed: " + e.message, true); }
  };
  const setJson = (kind, fn) => setFiles((prev) => ({ ...prev, [kind]: { ...prev[kind], json: fn(prev[kind].json) } }));
  const setPick = (lg, team) => {
    if (!canEdit) { say("Sign in to change picks", false); return; }
    if (activeOut) { say(`${entry.name} is out — no more picks for it`, false); return; }
    if (entry.picks[lg] !== team && !gauntletFeasible(entry.picks, lg, team)) { say(`${team} in ${lg} would leave no team for the Thanksgiving or Christmas leg (rules 8 and 9)`, true); return; }
    setJson("picks", (p) => ({ ...p, entries: p.entries.map((e, i) => { if (i !== active) return e; const picks = { ...e.picks }; if (picks[lg] === team) delete picks[lg]; else picks[lg] = team; return { ...e, picks }; }) }));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save("picks", `Picks: ${entries[active]?.name} ${lg} ${team}`), 800);
  };
  const saveActuals = (json, message) => { setJson("actuals", () => json); setTimeout(() => save("actuals", message), 0); };

  const signIn = () => { const t = tokenDraft.trim(); if (!t) return; try { localStorage.setItem(TOKEN_KEY, t); } catch {} setToken(t); setTokenDraft(""); setSignin(false); };
  const signOut = () => { try { localStorage.removeItem(TOKEN_KEY); } catch {} setToken(""); setUser(null); say("Signed out"); };
  // safety net for GitHub's scheduler: when the owner opens the app and the lines are stale, refresh them (once per visit)
  const autoRan = useRef(false);
  useEffect(() => {
    if (!user || !loaded || autoRan.current || updating) return;
    const age = data.oddsAt ? Date.now() - new Date(data.oddsAt).getTime() : Infinity;
    if (age > 10 * 3600 * 1000) { autoRan.current = true; updateLines(); }
  }, [user, loaded]); // eslint-disable-line
  const updateLines = async () => {
    setUpdating(true);
    try {
      await dispatchWorkflow(token, "update-data.yml");
      say("Line update started on GitHub — reloading data in 90 s…");
      setTimeout(async () => { await loadAll(token); say("Data reloaded"); setUpdating(false); }, 90000);
    } catch (e) { say("Could not start update: " + e.message + (e.status === 403 || e.status === 404 ? " (token needs Actions: read & write)" : ""), true); setUpdating(false); }
  };

  const entry = entries[active] || { name: "", picks: {} };
  const standing = useMemo(() => entries.map((e) => entryStatus(e, data.actuals)), [entries, data.actuals]);
  const activeOut = standing[active] && !standing[active].alive;
  const canPick = canEdit && !activeOut;
  const usedBy = useMemo(() => { const m = {}; for (const [leg, team] of Object.entries(entry.picks)) m[team] = leg; return m; }, [entry]);

  const params = useMemo(() => fitParams(data), [data]);
  const merr = useMemo(() => modelError(data, params), [data, params]);
  const statsAll = useMemo(() => boardStats(legId, data, params, entry.picks, style), [data, legId, params, entry, style]);
  const { rows: stats, ev: evInfo } = statsAll;
  const prevAt = data.prev?.oddsAt || null;
  const evNote = evInfo.blanked ? `EV unavailable: only ${evInfo.covered}/${evInfo.gamesTotal} games have a Win % (need ${Math.round(EV_MIN_COVERAGE * 100)}%)`
    : evInfo.coverage < 1 ? `EV based on ${evInfo.covered}/${evInfo.gamesTotal} games — teams without a Win % are left out, which flatters the rest` : null;
  // small signed change shown next to a number; hidden when it rounds to nothing
  const Delta = ({ v, kind }) => {
    if (v == null) return null;
    const pts = kind === "ev" ? v : v * 100;
    if (Math.abs(pts) < (kind === "ev" ? 0.005 : 0.5)) return null;
    const txt = kind === "ev" ? (pts > 0 ? "+" : "−") + Math.abs(pts).toFixed(2).replace(/^0/, "") : (pts > 0 ? "+" : "−") + Math.abs(Math.round(pts));
    return <span className={"d " + (pts > 0 ? "up" : "down")}>{txt}</span>;
  };
  // number stays centered in the column; the delta sits in the space to its right
  const Num = ({ children, d, kind }) => <span className="v"><span className="n">{children}</span><Delta v={d} kind={kind} /></span>;
  const diliTip = (st) => {
    const top = (st.forfeitParts || []).slice(0, 3).map((p) => `${legLabel(p.leg)} ${pct(p.win)} vs ${pct(p.bar)} bar`).join(", ");
    const hol = (st.holidayParts || []).map((p) => `${p.id === "TG" ? "Thanksgiving" : "Christmas"} pool down to ${p.n - 1}`).join(", ");
    return `EV ${st.ev.toFixed(2)} ÷ future forfeit ${st.forfeit.toFixed(2)}^${st.diliK.toFixed(1)}${hol ? ` × holiday scarcity ${st.holiday.toFixed(2)}` : ""} = ${st.dili.toFixed(2)}${top ? ` · biggest later edges: ${top}` : " · no edge over a realistic pick later"}${hol ? ` · burning it leaves the ${hol}` : ""}${st.dDili != null ? dTip("was", (st.dili - st.dDili).toFixed(2)) : ""}`;
  };
  const dTip = (label, was) => (prevAt ? ` · ${label} ${was} at the previous refresh (${fmtTime(prevAt)})` : "");

  const sortedTeams = useMemo(() => {
    const k = sort.key, d = sort.dir;
    const val = (t) => {
      if (k === "team") return t;
      if (k === "ev" || k === "evx" || k === "wp" || k === "pp" || k === "fv" || k === "dili") { const v = { ev: stats[t].ev, evx: stats[t].evx, wp: stats[t].win, pp: stats[t].pick, fv: stats[t].fv, dili: stats[t].dili }[k]; return v == null ? -Infinity : v; }
      const ln = lineFor(k, t, data); return ln && ln.spread != null ? -ln.spread : -Infinity; // favorites first
    };
    return [...ALL_TEAMS].sort((a, b) => { const va = val(a), vb = val(b); if (va === vb) return a < b ? -1 : 1; return (va < vb ? 1 : -1) * d; });
  }, [sort, stats, data]);

  // stretch the week columns (and the Future column absorbs the remainder) so the board fills its container
  const wrapRef = useRef(null);
  const [fit, setFit] = useState({ cw: 48, teamw: 116 });
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const LEFT = 418, MIN_CW = 48, MIN_TEAM = 116;
    const measure = () => {
      const w = el.clientWidth - LEFT - MIN_TEAM;
      const cw = Math.max(MIN_CW, Math.floor(w / LEGS.length));
      setFit({ cw, teamw: Math.max(MIN_TEAM, MIN_TEAM + w - cw * LEGS.length) });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [view]);
  const clickSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === "team" ? -1 : 1 }));
  const fmtSp = (v) => (v == null ? "" : v > 0 ? "+" + v : v === 0 ? "PK" : String(v));
  const pct = (v) => (v == null ? "–" : Math.round(v * 100) + "%");
  const cur = LEGS.find((l) => l.id === legId);
  const legInfo = data.legs[legId];
  const flags = legInfo ? [legInfo.counts.degraded && `${legInfo.counts.degraded} at 2 books`, legInfo.counts.single && `${legInfo.counts.single} single-book`].filter(Boolean).join(", ") : "";
  const stamp = legInfo ? `${legInfo.counts.closing === legInfo.games ? "closing lines" : "book consensus"} · ${fmtTime(legInfo.asof)} · ${legInfo.games}/${legInfo.gamesTotal} games${flags ? ` (${flags})` : ""}` : "no lines yet for this leg";

  const Header = ({ top }) => (
    <>
      {top ? <th className="L entry">Entry</th> : <>
        <th className={"L wp" + (sort.key === "wp" ? " sorted" : "")} onClick={() => clickSort("wp")} title={`True Win % — median of each book's no-vig moneyline probability · ${stamp}`}>W%</th>
        <th className={"L pp" + (sort.key === "pp" ? " sorted" : "")} onClick={() => clickSort("pp")} title="Circa pick popularity (actual once posted, field model before)">P%</th>
        <th className={"L fv" + (sort.key === "fv" ? " sorted" : "")} onClick={() => clickSort("fv")} title="Future value: about how many strong-favorite weeks the team has left after this one">Future</th>
        <th className={"L ev" + (sort.key === "ev" ? " sorted" : "") + (evNote ? " partial" : "")} onClick={() => clickSort("ev")} title={(evNote || `EV for ${legLabel(cur)}`) + (prevAt ? ` · small numbers = change since the previous refresh (${fmtTime(prevAt)})` : "")}>EV{evNote ? "*" : ""}</th>
        <th className={"L evx" + (sort.key === "evx" ? " sorted" : "")} onClick={() => clickSort("evx")} title={`Exact EV: win % × expected share of the survivors, by convolution over every other game's outcome. Same scale as EV, which is its linear approximation and the baseline.${prevAt ? ` · small numbers = change since ${fmtTime(prevAt)}` : ""}`}>Exact</th>
        <th className={"L dili" + (sort.key === "dili" ? " sorted" : "")} onClick={() => clickSort("dili")} title={`DILI — "do I love it?": this week's EV net of what the team is worth to keep, for this entry. Style: ${style}${prevAt ? ` · small numbers = change since ${fmtTime(prevAt)}` : ""}`}>DILI</th>
        <th className={"L team" + (sort.key === "team" ? " sorted" : "")} onClick={() => clickSort("team")}>Team</th>
      </>}
      {LEGS.map((l) => (
        <th key={l.id} className={(l.holiday ? "hol" : "") + (sort.key === l.id ? " sorted" : "") + (l.id === legId ? " curcol" : "")} title={`${legLabel(l)}${l.sub ? ` (${l.sub})` : ""} — click to sort by spread`} onClick={() => clickSort(l.id)}>
          {l.label}
        </th>
      ))}
    </>
  );
  // books contributing to this leg's lines, for the note under the controls
  const lineNote = (() => {
    if (!legInfo) return "No lines yet for this week";
    const books = new Set();
    for (const g of Object.values(legInfo.detail)) for (const r of g.rows) if (!r.excluded) books.add(r.book);
    const real = [...books].filter((b) => b !== "nflverse").length;
    if (legInfo.counts.closing) return `Closing lines · ${legInfo.games}/${legInfo.gamesTotal} games`;      // week already played
    return `Lines updated ${fmtTime(legInfo.asof)} · ${real} sportsbook${real === 1 ? "" : "s"}`;
  })();

  return (
    <div className={"csp" + (canPick ? "" : " ro")} onMouseDown={(e) => { if (e.target.closest("button")) e.preventDefault(); }}>
      <style>{CSS}</style>
      <div className="bar">
        <div className="left">
          <h1>Circa Survivor 2026 <span className="ver">v{VERSION}</span></h1>
          <span className="views">
            <button className={view === "planner" ? "on" : ""} onClick={() => setView("planner")}>Planner</button>
            <button className={view === "actuals" ? "on" : ""} onClick={() => setView("actuals")}>Actuals</button>
          </span>
          {view === "planner" && <span className="seg">
            {entries.map((e, i) => (
              <button key={i} className={(i === active ? "on" : "") + (standing[i]?.alive === false ? " out" : "")} onClick={() => setActive(i)}
                      title={standing[i]?.alive === false ? `Out in ${legLabel(standing[i].leg)} — still viewable, but no new picks` : "Plan this entry"}>
                <span className="nm">{e.name}</span><span className="n">{standing[i]?.alive === false ? "out" : Object.keys(e.picks).length + "/20"}</span>
              </button>
            ))}
          </span>}
        </div>
        <div className="ctl">
          <div className="row">
            {view === "actuals" && (status || !loaded) && <span className={"note" + (statusErr ? " err" : " msg")}>{!loaded ? "Loading…" : status}</span>}
            <a className="link" href="guide.html" title="Plain-English walkthrough of every number here">How it works</a>
            <a className="link" href="math.html" title="Every projection worked out by hand, with rules of thumb">The math</a>
            {canEdit ? <><span className="who">{user}</span><button className="link" onClick={signOut}>Sign out</button></>
              : <button className="link" onClick={() => setSignin((s) => !s)}>Sign in to edit</button>}
          </div>
        </div>
      </div>

      {signin && !canEdit && (
        <div className="panel">
          <div className="f">
            Viewers can look; only the owner edits. Paste a GitHub <b>fine-grained personal access token</b> for <code>{REPO}</code> with
            <code>Contents: read & write</code> (and <code>Actions: read & write</code> for the "Update lines now" button). It is kept only in this browser.
          </div>
          <div className="row">
            <input type="password" placeholder="github_pat_…" value={tokenDraft} onChange={(e) => setTokenDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && signIn()} style={{ width: 320 }} />
            <button className="btn" onClick={signIn}>Sign in</button>
            <button className="ghost" onClick={() => setSignin(false)}>Cancel</button>
          </div>
        </div>
      )}
      {view === "actuals" && <Actuals data={data} params={params} canEdit={canEdit} onSave={saveActuals} />}
      {view === "planner" && audit && <AuditPanel legId={legId} data={data} params={params} merr={merr} stats={stats} evNote={evNote} style={style} pickStyle={pickStyle} diliK={statsAll.k} />}
      {view === "planner" && <>

      <div className="wrap" ref={wrapRef} onScroll={(e) => e.currentTarget.classList.toggle("scrolled", e.currentTarget.scrollTop > 2)} style={{ "--n": entries.length, "--cw": fit.cw + "px", "--teamw": fit.teamw + "px" }}>
        <div className="corner">
          <div className="controls">
            <div className="row">
              <select value={legId} onChange={(e) => setLegId(e.target.value)} title="Week to plan">
                {LEGS.map((l) => <option key={l.id} value={l.id}>{legLabel(l)}</option>)}
              </select>
              <button className={"ghost" + (audit ? " on" : "")} onClick={() => setAudit((a) => !a)} title="How W%, P%, EV, DILI and the ratings are calculated for this week">Model details {audit ? "▴" : "▾"}</button>
            </div>
            <div className="row">
              {canEdit && <button className="btn" onClick={updateLines} disabled={updating} title="Pull fresh moneylines from the sportsbooks now (otherwise twice a day)">{updating ? "Updating…" : "Update lines"}</button>}
              <span className={"note" + (status ? (statusErr ? " err" : " msg") : "")} title={!status ? `Lines update automatically twice a day. ${stamp}` : undefined}>{!loaded ? "Loading…" : status || lineNote}</span>
            </div>
          </div>
        </div>
        <table>
          <tbody className="sum">
            <tr className="top" style={{ "--top": "0px" }}>
              <td className="L pctl" colSpan={6} rowSpan={entries.length + 1} />
              <Header top />
            </tr>
            {entries.map((e, i) => (
              <tr key={"s" + i} className={(i === active ? "sel" : "") + (standing[i]?.alive === false ? " out" : "")} style={{ "--top": `calc(var(--th) + ${i} * var(--rh))` }}>
                <td className="L entry" title={standing[i]?.alive === false ? `Out in ${legLabel(standing[i].leg)}` : ""}>
                  <span className="nm">{e.name}</span>{standing[i]?.alive === false && <span className="tag">out {standing[i].leg.label}</span>}
                </td>
                {LEGS.map((l) => {
                  const t = e.picks[l.id];
                  return (
                    <td key={l.id} className={"s" + (t ? "" : " empty") + (l.id === legId ? " curcol" : "")}>{t ? <span className="chip" style={{ background: COLORS[t][0], color: COLORS[t][1] }}>{t}</span> : "·"}</td>
                  );
                })}
              </tr>
            ))}
            <tr className="gap"><td colSpan={7} /> {LEGS.map((l) => <td key={l.id} className={l.id === legId ? "curcol" : ""} />)}</tr>
            <tr className="hdr2"><Header /></tr>
          </tbody>
          <tbody>
            {sortedTeams.map((team) => {
              const usedLeg = usedBy[team];
              const st = stats[team];
              const inLeg = !!OPP[legId][team];
              return (
                <tr key={team} className={usedLeg && usedLeg !== legId ? "gone" : ""}>
                  <td className={"L wp num" + (st.win == null ? " blank" : st.winTop ? " hi" : "") + (st.status === "single" || st.status === "degraded" ? " weak" : "")} title={inLeg ? (st.win == null ? "No two-sided moneyline posted yet for this game" : `${pct(st.win)} — ${STATUS_TEXT[st.status]}${st.status !== "closing" ? ` (${st.n})` : ""} · e.g. ${st.refBook} ${fmtSp(st.ml)} / ${fmtSp(st.oppMl)}${st.dWin != null ? dTip("was", pct(st.win - st.dWin)) : ""}`) : ""}><Num d={st.dWin} kind="pct">{inLeg ? pct(st.win) : ""}</Num></td>
                  <td className={"L pp num" + (st.pick == null ? " blank" : st.pick > 0.099 ? " warn" : "")} title={inLeg ? (st.act ? "Circa actual" : `field model ${pct(st.pm)}${st.dPick != null ? dTip("was", pct(st.pick - st.dPick)) : ""}`) : ""}><Num d={st.dPick} kind="pct">{inLeg ? (st.pick == null ? "–" : st.pick < 0.005 ? "<1%" : Math.round(st.pick * 100) + "%") : ""}</Num></td>
                  <td className={"L fv num" + (st.fv == null ? " blank" : Math.round(st.fv * 10) / 10 <= 2 ? " hi" : "")} title={st.fv == null ? "No power ratings yet" : `About ${st.fv.toFixed(1)} strong-favorite weeks left after this one (a 75% spot counts ~1, 65% counts ½, 55% a little)`}>
                    <span className="v"><span className="n">{st.fv == null ? "–" : st.fv.toFixed(1)}</span></span>
                  </td>
                  <td className={"L ev num" + (st.ev == null ? " blank" : st.evTop ? " hi" : "")} title={st.dEv != null ? `EV ${st.ev.toFixed(2)}${dTip("was", (st.ev - st.dEv).toFixed(2))}` : ""}><Num d={st.dEv} kind="ev">{st.ev == null ? (inLeg ? "–" : "") : st.ev.toFixed(2)}</Num></td>
                  <td className={"L evx num" + (st.evx == null ? " blank" : st.evxTop ? " hi" : "")} title={st.evx != null && st.ev != null ? `Exact ${st.evx.toFixed(3)} vs linearized ${st.ev.toFixed(3)}${st.dEvx != null ? dTip("was", (st.evx - st.dEvx).toFixed(2)) : ""}` : ""}><Num d={st.dEvx} kind="ev">{st.evx == null ? (inLeg ? "–" : "") : st.evx.toFixed(2)}</Num></td>
                  <td className={"L dili num" + (st.dili == null ? " blank" : st.diliTop ? " hi" : "")} title={st.infeasible ? "Refused: this pick leaves no team for the Thanksgiving or Christmas leg (rules 8 and 9)" : st.dili == null ? (inLeg ? (usedLeg ? "Already used" : "Needs an EV") : "") : diliTip(st)}>
                    <Num d={st.dDili} kind="ev">{st.infeasible ? "✕" : st.dili == null ? (inLeg ? "–" : "") : st.dili.toFixed(2)}</Num>
                  </td>
                  <td className="L team" style={{ "--tc": COLORS[team][0] }}>
                    <span className="nm">{team}</span>
                    {TG_TEAMS.has(team) && <span className="hd" title="Plays in Thanksgiving leg" />}
                    {XM_TEAMS.has(team) && <span className="hd x" title="Plays in Christmas leg" />}
                    {usedLeg && usedLeg !== legId && <span className="used">{LEGS.find((l) => l.id === usedLeg).label}</span>}
                  </td>
                  {LEGS.map((l) => {
                    const g = OPP[l.id][team];
                    const ln = g ? lineFor(l.id, team, data) : null;
                    const pickHere = entry.picks[l.id] === team;
                    const legTaken = !!entry.picks[l.id] && !pickHere;
                    const dead = usedLeg && usedLeg !== l.id;
                    const others = entries.map((e, i) => (i !== active && e.picks[l.id] === team ? i + 1 : null)).filter(Boolean).join("");
                    let cls = "c";
                    if (l.holiday) cls += " hol";
                    if (l.id === legId) cls += " curcol" + (team === sortedTeams[sortedTeams.length - 1] ? " last" : "");
                    if (!g) cls += " bye"; else if (pickHere) cls += " pick"; else if (dead) cls += " dead"; else if (legTaken) cls += " dim"; else if (!g.home) cls += " away";
                    const label = !g ? "" : (g.neutral ? "n " : g.home ? "vs " : "@ ") + g.opp;
                    const fav = ln && ln.spread != null && ln.spread < 0 && !dead ? Math.min(1, -ln.spread / 14) : 0;
                    const tip = !g ? `${team} bye` : dead ? `${team} already used (${legLabel(LEGS.find((x) => x.id === usedLeg))})`
                      : `${legLabel(l)}: ${team} ${g.home || g.neutral ? "vs" : "at"} ${g.opp}${g.neutral ? " (neutral)" : ""}${ln ? ` · ${fmtSp(ln.spread)}${ln.market ? ` · ML ${fmtSp(ln.ml)} / ${fmtSp(ln.oppMl)} · True Win ${pct(ln.win)}` : ln.proj ? ` · projected ${pct(ln.win)} (ratings, not market)` : ""}` : ""}${others ? ` · also picked by entry ${others.split("").join(" and ")}` : ""}${canPick ? "" : activeOut ? " · this entry is out" : " · sign in to change picks"}`;
                    return (
                      <td key={l.id} className={cls} title={tip} style={fav > 0 && !pickHere ? { "--fav": (0.03 + 0.15 * fav).toFixed(3) } : undefined} onClick={() => g && !dead && setPick(l.id, team)}>
                        {label}
                        {ln && <span className={"sp" + (ln.proj ? " proj" : "")}>{ln.spread != null ? fmtSp(ln.spread) : ln.market ? "ML " + fmtSp(ln.ml) : ""}</span>}
                        {others && <span className="oth" title={`Also picked by entry ${others.split("").join(" and ")}`}>{others}</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      </>}
    </div>
  );
}

// ---------- Model details panel ----------
function AuditPanel({ legId, data, params, merr, stats, evNote, style, pickStyle, diliK }) {
  const act = data.actuals[legId];
  const leg = data.legs[legId] || {};
  const av = availability(legId, data);
  const mlTxt = (v) => (v == null ? "" : v > 0 ? "+" + v : String(v));
  const teams = Object.keys(OPP[legId]).filter((t) => stats[t].win != null).sort((a, b) => (stats[b].dili ?? -1) - (stats[a].dili ?? -1) || (stats[b].pick || 0) - (stats[a].pick || 0));
  const pc = (v, d = 0) => (v == null ? "–" : (100 * v).toFixed(d) + "%");
  return (
    <div className="audit">
      <div className="secs">
        <div className="sec">
          <h4>True Win %</h4>
          {leg.games ? <p>Each book's moneyline is de-vigged on its own; the consensus is the median of the books' home-win chances, away = 1 − home. {leg.games}/{leg.gamesTotal} games as of {fmtTime(leg.asof)}. Books asked: {(leg.books || []).map((b) => BOOK_NAME[b] || b).join(", ")}. 3+ books normal, 2 degraded, 1 single-book. Quotes taken after kickoff or 48 h staler than the freshest are left out.</p>
            : <p>No moneylines for this week yet. Books post them about a week out.</p>}
          {evNote && <p><b>EV coverage.</b> {evNote}.</p>}
        </div>
        <div className="sec">
          <h4>P% — pick popularity</h4>
          {act ? <p>Locked week: P% is Circa's posted distribution.</p>
            : <p>Field model <code>win^{params.a} × e^(−{params.b} × future value) × availability</code>, normalized over favored teams. Fit on {params.legs} week{params.legs === 1 ? "" : "s"} of Circa actuals, weighting each team's miss by its share and holding the knobs near {PRIOR.a} / {PRIOR.b} until more weeks accumulate{merr ? <>; average miss so far {pc(merr.err)} per team</> : null}.</p>}
        </div>
        <div className="sec">
          <h4>DILI — do I love it?</h4>
          <p>EV divided by the future forfeit<sup>k</sup>, times a holiday-scarcity factor. The forfeit is how much this team beats a realistic pick, the average of this entry's top-3 other available teams, in each later week, weighted by the chance of still being alive then ({Math.round(SURVIVE * 100)}% per week). k = style × calendar, this week {diliK.toFixed(2)}. Green marks this entry's best five.</p>
          <p><b>Holiday scarcity.</b> Thanksgiving has 10 eligible teams and Christmas 8, six of them in both, and an entry with none left must miss that leg. Teams carrying a {"\u25CF"} (Thanksgiving) or {"\u25CF"} (Christmas) dot are docked by how much of the pool they would take with them, whether they are favored that day or not; the dock grows as the pool empties and is total on the last eligible team.</p>
          <div className="row"><span className="lbl">Style</span>
            <span className="seg">
              {[["now", "Now"], ["balanced", "Balanced"], ["future", "Future"]].map(([v, l]) => <button key={v} className={style === v ? "on" : ""} onClick={() => pickStyle(v)} title={v === "now" ? "Lean on this week's EV" : v === "future" ? "Save the studs, take risk early" : "Even weighting"}>{l}</button>)}
            </span>
          </div>
        </div>
        <div className="sec">
          <h4>Future value and ratings</h4>
          <p>Future value is the expected number of strong-favorite weeks left: each later week counts by how much it looks like a strong spot (about 1 at 75%, ½ at 65%, a little at 55%). Ratings: {data.ratingsSrc || "none"}{data.ratingsAt ? <>, updated {fmtTime(data.ratingsAt)}</> : null}. Projections never feed W%.</p>
        </div>
      </div>
      <h4 className="th">This week, by team</h4>
      <table>
        <thead><tr><th>Team</th><th>ML</th><th>Win</th><th>Future</th><th>Field holding</th><th>Model P%</th><th>Final P%</th><th>EV</th><th>Exact EV</th><th>Forfeit</th><th>Holiday</th><th>DILI</th></tr></thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t}>
              <td>{t}</td>
              <td className="mut">{stats[t].ml != null ? `${mlTxt(stats[t].ml)} / ${mlTxt(stats[t].oppMl)}` : "–"}</td>
              <td>{pc(stats[t].win)}</td>
              <td>{stats[t].fv == null ? "–" : stats[t].fv.toFixed(1)}</td>
              <td title="share of the live field that has not used this team yet">{pc(av[t])}</td>
              <td className="mut">{pc(stats[t].pm, 1)}</td>
              <td>{pc(stats[t].pick, 1)}</td>
              <td>{stats[t].ev == null ? "–" : stats[t].ev.toFixed(2)}</td>
              <td>{stats[t].evx == null ? "–" : stats[t].evx.toFixed(2)}</td>
              <td className="mut">{stats[t].forfeit == null ? "–" : stats[t].forfeit.toFixed(3)}</td>
              <td className="mut" title={(stats[t].holidayParts || []).map((h) => `${h.id} pool ${h.n}`).join(", ")}>{stats[t].holiday == null || stats[t].holiday === 1 ? "–" : stats[t].holiday.toFixed(3)}</td>
              <td className="fin">{stats[t].dili == null ? "–" : stats[t].dili.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {leg.detail && Object.keys(leg.detail).length > 0 && <>
        <h4 className="th">Market detail by game</h4>
        <table>
          <thead><tr><th>Game</th><th>Consensus (home)</th><th>Status</th><th>Book</th><th>Home / away ML</th><th>Book no-vig (home)</th><th>Quoted</th><th>Note</th></tr></thead>
          <tbody>
            {Object.values(leg.detail).sort((a, b) => (a.kickoff || "").localeCompare(b.kickoff || "")).flatMap((g) => g.rows.map((r, i) => (
              <tr key={g.key + r.book}>
                <td>{i === 0 ? `${g.away} @ ${g.home}` : ""}</td>
                <td className={i === 0 ? "fin" : "mut"}>{i === 0 ? (g.pHome == null ? "–" : `${g.home} ${pc(g.pHome, 1)}`) : ""}</td>
                <td className="mut">{i === 0 ? `${STATUS_TEXT[g.status]}${g.status !== "closing" && g.status !== "none" ? ` (${g.valid})` : ""}` : ""}</td>
                <td className={r.excluded ? "mut" : ""}>{r.name}</td>
                <td className={r.excluded ? "mut" : ""}>{r.ml != null ? `${mlTxt(r.ml)} / ${mlTxt(r.oppMl)}` : "–"}</td>
                <td className={r.excluded ? "mut" : ""}>{r.pHome == null ? "–" : pc(r.pHome, 1)}</td>
                <td className="mut">{r.asof ? fmtTime(r.asof) : "–"}</td>
                <td className="mut">{r.excluded ? `excluded: ${r.excluded}` : ""}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </>}
    </div>
  );
}

// ---------- Actuals tab ----------
function Actuals({ data, params, canEdit, onSave }) {
  const { entries, contest, actuals } = data;
  const tl = fieldTimeline(data);
  const last = tl[tl.length - 1];
  const [selLeg, setSelLeg] = useState(last ? last.leg.id : null);
  const [editing, setEditing] = useState(null); // leg id being edited, or "contest"
  useEffect(() => { if (selLeg == null && last) setSelLeg(last.leg.id); }, [last, selLeg]);
  // Jamie's entries: alive unless a completed leg's pick lost (or no pick was made for a completed leg)
  const alive = entries.map((e) => tl.every((r) => { const t = e.picks[r.leg.id]; return t && !actuals[r.leg.id].lost.includes(t); }));
  const nAlive = alive.filter(Boolean).length;
  const value0 = contest.start ? contest.pool / contest.start : 0;
  const equityNow = last ? nAlive * contest.share * last.value : entries.length * contest.share * value0;
  const equity0 = entries.length * contest.share * value0;
  const money = (v) => "$" + Math.round(v).toLocaleString();
  const num = (v) => v.toLocaleString();
  const pctOf = (n, d) => (d ? (100 * n / d).toFixed(n / d < 0.01 ? 2 : 1) + "%" : "–");
  const name = (t) => (t === "NOPICK" ? "No pick" : t);
  const nextLeg = LEGS.find((l) => !actuals[l.id]);

  // series for chart: live entries per leg + equity
  const pts = [{ x: "Start", live: contest.start, eq: equity0 }, ...tl.map((r, i) => ({ x: r.leg.label, live: r.after, eq: entries.reduce((s, e) => s + (tl.slice(0, i + 1).every((q) => e.picks[q.leg.id] && !actuals[q.leg.id].lost.includes(e.picks[q.leg.id])) ? 1 : 0), 0) * contest.share * r.value }))];

  return (
    <div className="act">
      <div className="strip">
        <div className="fig"><div className="v">{num(contest.start)}</div><div className="k">entries started, {money(contest.pool)} pool</div></div>
        <div className="fig"><div className="v">{num(last ? last.after : contest.start)}</div><div className="k">still alive{last ? `, ${pctOf(contest.start - last.after, contest.start)} out` : ""}</div></div>
        <div className="fig"><div className="v">{money(last ? last.value : value0)}</div><div className="k">implied value per entry</div></div>
        <div className="fig"><div className={"v" + (equityNow > equity0 ? " up" : "")}>{money(equityNow)}</div><div className="k">your equity, {nAlive} of {entries.length} alive</div></div>
        {canEdit && <div className="actions">
          {nextLeg && <button className="btn" onClick={() => setEditing(nextLeg.id)}>Enter {legLabel(nextLeg)} results</button>}
          <div style={{ display: "flex", gap: 6 }}>
            {selLeg && <button className="ghost" onClick={() => setEditing(selLeg)}>Edit {legLabel(LEGS.find((l) => l.id === selLeg))}</button>}
            <button className="ghost" onClick={() => setEditing("contest")}>Contest size</button>
          </div>
        </div>}
      </div>

      {editing === "contest" && <ContestEditor contest={contest} onCancel={() => setEditing(null)}
        onSave={(c) => { onSave({ contest: c, legs: actuals }, "Actuals: contest size"); setEditing(null); }} />}
      {editing && editing !== "contest" && <LegEditor legId={editing} current={actuals[editing]} onCancel={() => setEditing(null)}
        onSave={(legData) => { onSave({ contest, legs: { ...actuals, [editing]: legData } }, `Actuals: ${legLabel(LEGS.find((l) => l.id === editing))}`); setSelLeg(editing); setEditing(null); }} />}

      {pts.length > 1 && <Chart pts={pts} money={money} num={num} start={contest.start} />}

      {tl.filter((r) => r.leg.id === selLeg).map((r) => {
        const a = actuals[r.leg.id];
        const tot = Object.values(a.picks).reduce((x, y) => x + y, 0);
        const rows = Object.entries(a.picks).sort((x, y) => y[1] - x[1]);
        const max = rows.length ? rows[0][1] : 1;
        const st = (t) => (a.lost.includes(t) ? "L" : a.pending.includes(t) ? "P" : a.won.includes(t) ? "W" : "");
        const mp = modelPick(r.leg.id, data, params);
        const hasM = Object.keys(mp).length > 0;
        const fp = (v) => (v == null ? "" : v < 0.005 ? "<1%" : (100 * v).toFixed(v < 0.1 ? 1 : 0) + "%");
        return (
          <div className="legcard" key={r.leg.id}>
            <div className="hd2">
              <select className="legsel" value={selLeg} onChange={(e) => setSelLeg(e.target.value)}>
                {tl.map((q) => <option key={q.leg.id} value={q.leg.id}>{legLabel(q.leg)}</option>)}
              </select>
              <span className="m"><b>{num(r.before)}</b> in → <b>{num(r.lost)}</b> out ({pctOf(r.lost, r.before)}) → <b>{num(r.after)}</b> live</span>
            </div>
            <table className="dist">
              <thead><tr><th>Team</th><th>Entries</th><th>% of field</th><th style={{ textAlign: "left" }}></th>{hasM && <th title={`win^${params.a} · e^(−${params.b}·FV) · availability`}>Model est.</th>}<th>Result</th><th>Eliminated</th></tr></thead>
              <tbody>
                {rows.map(([t, n]) => {
                  const k = st(t);
                  const col = COLORS[t] || ["#c9c6bf", "#1a1a1a"];
                  return (
                    <tr key={t} className={k}>
                      <td><span className="chip" style={{ background: col[0], color: col[1] }}>{name(t)}</span></td>
                      <td>{num(n)}</td>
                      <td>{pctOf(n, tot)}</td>
                      <td style={{ textAlign: "left", width: "26%" }}><span className="bar" style={{ width: (100 * n / max) + "%" }} /></td>
                      {hasM && <td style={{ color: "#6f6c66" }}>{fp(mp[t])}</td>}
                      <td className="res">{k === "W" ? "Won" : k === "L" ? "Lost" : k === "P" ? "Pending" : ""}</td>
                      <td className="elim">{k === "L" ? "−" + num(n) : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      {!tl.length && <div className="editor"><h3>No Circa results entered yet.</h3><div className="row">{canEdit ? "Use “Enter Week 1 results” above after Circa posts its selections." : "Check back after the first week locks."}</div></div>}
    </div>
  );
}

// Enter/edit one leg of Circa's posted selections: entries per team and each team's result.
function LegEditor({ legId, current, onSave, onCancel }) {
  const leg = LEGS.find((l) => l.id === legId);
  const teams = [...Object.keys(OPP[legId]).sort(), "NOPICK"];
  const init = () => {
    const rows = {};
    for (const t of teams) rows[t] = { n: current?.picks?.[t] ?? "", r: current?.lost?.includes(t) ? "lost" : current?.pending?.includes(t) ? "pending" : current?.won?.includes(t) ? "won" : "" };
    return rows;
  };
  const [rows, setRows] = useState(init);
  const set = (t, k, v) => setRows((p) => ({ ...p, [t]: { ...p[t], [k]: v } }));
  const total = teams.reduce((s, t) => s + (parseInt(rows[t].n, 10) || 0), 0);
  const submit = () => {
    const picks = {}, won = [], lost = [], pending = [];
    for (const t of teams) {
      const n = parseInt(rows[t].n, 10);
      if (n > 0) picks[t] = n;
      if (rows[t].r === "won") won.push(t); else if (rows[t].r === "lost") lost.push(t); else if (rows[t].r === "pending") pending.push(t);
    }
    onSave({ asOf: new Date().toLocaleDateString([], { month: "short", day: "numeric" }), picks, won, lost, pending });
  };
  // quick fills: mark every team with entries but no result
  const fillRest = (r) => setRows((p) => { const q = { ...p }; for (const t of teams) if (!q[t].r) q[t] = { ...q[t], r }; return q; });
  return (
    <div className="editor">
      <h3>{legLabel(leg)} — Circa's posted selections</h3>
      <div className="row">
        <span style={{ color: "#6f6c66" }}>Entries so far: <b>{total.toLocaleString()}</b></span>
        <button className="ghost" onClick={() => fillRest("pending")}>Rest = pending</button>
        <button className="ghost" onClick={() => fillRest("lost")}>Rest = lost</button>
      </div>
      <div className="grid">
        {teams.map((t) => {
          const col = COLORS[t] || ["#c9c6bf", "#1a1a1a"];
          return (
            <div className="g" key={t}>
              <span className="chip" style={{ background: col[0], color: col[1] }}>{t === "NOPICK" ? "No pick" : t}</span>
              <input className="num" type="number" min="0" placeholder="0" value={rows[t].n} onChange={(e) => set(t, "n", e.target.value)} />
              <select value={rows[t].r} onChange={(e) => set(t, "r", e.target.value)}>
                <option value="">–</option><option value="won">Won</option><option value="lost">Lost</option><option value="pending">Pending</option>
              </select>
            </div>
          );
        })}
      </div>
      <div className="row">
        <button className="btn" onClick={submit}>Save to GitHub</button>
        <button className="ghost" onClick={onCancel}>Cancel</button>
        <span style={{ color: "#6f6c66" }}>Teams with 0 entries are left out. Every team with entries needs a result before the leg's math is right.</span>
      </div>
    </div>
  );
}

function ContestEditor({ contest, onSave, onCancel }) {
  const [c, setC] = useState({ start: contest.start, pool: contest.pool, share: Math.round(contest.share * 100) });
  const f = (k) => (e) => setC((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="editor">
      <h3>Contest size</h3>
      <div className="row">
        <label>Starting entries <input className="num" type="number" value={c.start} onChange={f("start")} /></label>
        <label>Prize pool $ <input className="num" type="number" value={c.pool} onChange={f("pool")} style={{ width: 110 }} /></label>
        <label>Your share of each entry % <input className="num" type="number" value={c.share} onChange={f("share")} /></label>
      </div>
      <div className="row">
        <button className="btn" onClick={() => onSave({ start: +c.start || 0, pool: +c.pool || 0, share: (+c.share || 0) / 100 })}>Save to GitHub</button>
        <button className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function Chart({ pts, money, num, start }) {
  const Mini = ({ title, k, color, fmt, top }) => {
    const W = 360, H = 140, px = 30, py = 22;
    const xs = pts.map((_, i) => px + (i * (W - 2 * px)) / Math.max(1, pts.length - 1));
    const mx = top || Math.max(...pts.map((p) => p[k])) * 1.2 || 1;
    const y = (v) => H - py - ((H - 2 * py) * v) / mx;
    const d = pts.map((p, i) => (i ? "L" : "M") + xs[i].toFixed(1) + " " + y(p[k]).toFixed(1)).join(" ");
    return (
      <div className="chart" style={{ minWidth: 280 }}>
        <h3>{title}</h3>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} fontFamily="inherit" fontSize="10">
          <line x1={px} x2={W - px} y1={H - py} y2={H - py} stroke="#E7E5DF" />
          <path d={d} fill="none" stroke={color} strokeWidth="2" />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={xs[i]} cy={y(p[k])} r="3" fill={color} />
              {(i === 0 || i === pts.length - 1 || pts.length <= 4) && <text x={xs[i]} y={y(p[k]) - 8} textAnchor="middle" fill={color} fontWeight="600">{fmt(p[k])}</text>}
              <text x={xs[i]} y={H - 6} textAnchor="middle" fill="#9A9DA6">{p.x}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <Mini title="Entries alive, by week" k="live" color="#5B5E66" fmt={num} top={start * 1.15} />
      <Mini title="Your equity, by week" k="eq" color="#2F8F3E" fmt={money} />
    </div>
  );
}
