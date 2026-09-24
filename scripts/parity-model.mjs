// Runs the model of a base git ref and of the working tree on the same data files and asserts every output is
// deep-equal. Usage: node scripts/parity-model.mjs [base-ref, default HEAD]
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const OUT = join(ROOT, "node_modules/.cache/parity");
const base = process.argv[2] || "HEAD";
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();

const burnedFor = (picks, legId) => {
  const usedBy = {};
  for (const [leg, team] of Object.entries(picks)) usedBy[team] = leg;
  return new Set(Object.keys(usedBy).filter((t) => usedBy[t] !== legId));
};
const API = ["buildData", "fitParams", "modelError", "openLeg", "fieldTimeline", "availability", "boardStats"];

function liftBoardFromComponent(file) {
  let s = readFileSync(file, "utf8");
  const csStart = s.indexOf("  function computeStats(legId, data, params) {\n");
  const csEnd = s.indexOf("\n  }\n", csStart) + "\n  }\n".length;
  const saHead = "  const statsAll = useMemo(() => {\n", saTail = "\n  }, [data, legId, params, burned, style]);\n";
  const saStart = s.indexOf(saHead), saEnd = s.indexOf(saTail, saStart);
  if (csStart < 0 || saStart < 0 || saEnd < 0) throw new Error(`${file}: neither src/model/board.js nor the in-component computeStats and statsAll shape`);
  const computeStats = s.slice(csStart, csEnd).replace(/^  /gm, "");
  const board = s.slice(saStart + saHead.length, saEnd);
  s = s.slice(0, csStart) + s.slice(csEnd);
  s += `\nexport ${computeStats}\nexport function boardStats(legId, data, params, burned, style) {\n${board}\n}\nexport { modelError };\n`;
  writeFileSync(file, s);
}

function entryFor(tree) {
  if (existsSync(join(tree, "src/model/board.js")))
    return ["lines", "field", "value", "popularity", "board"].map((m) => `export * from ${JSON.stringify(join(tree, `src/model/${m}.js`))};`).join("\n");
  liftBoardFromComponent(join(tree, "src/CircaSurvivorPlanner.jsx"));
  return `export { ${API.join(", ")} } from ${JSON.stringify(join(tree, "src/CircaSurvivorPlanner.jsx"))};`;
}

function load(tree, name) {
  mkdirSync(OUT, { recursive: true });
  const entry = join(OUT, `${name}.entry.mjs`), out = join(OUT, `${name}.cjs`);
  writeFileSync(entry, entryFor(tree) + "\n");
  execFileSync(join(ROOT, "node_modules/.bin/esbuild"), [entry, "--bundle", "--platform=node", "--format=cjs", `--outfile=${out}`,
    "--loader:.jsx=jsx", "--jsx=automatic", "--external:react", "--external:react-dom", "--log-level=warning"], { stdio: "inherit" });
  const m = createRequire(join(OUT, "x.cjs"))(out);
  for (const f of API) if (typeof m[f] !== "function") throw new Error(`${name}: ${f} not found`);
  if (m.gauntletFeasible) return m;
  return { ...m, boardStats: (legId, data, params, picks, style) => m.boardStats(legId, data, params, burnedFor(picks, legId), style) };
}

const wt = mkdtempSync(join(tmpdir(), "parity-"));
git("worktree", "add", "--detach", "--quiet", wt, base);
let fails = 0, checks = 0;
try {
  for (const f of ["picks", "actuals", "odds", "ratings"]) cpSync(join(ROOT, `data/${f}.json`), join(wt, `data/${f}.json`));
  const A = load(wt, "base"), B = load(ROOT, "tree");
  const { LEGS, OPP } = await import(join(ROOT, "src/schedule.js"));
  const files = Object.fromEntries(["picks", "actuals", "odds", "ratings"].map((f) => [f, JSON.parse(readFileSync(join(ROOT, `data/${f}.json`), "utf8"))]));
  const same = (label, a, b) => { checks++; if (!isDeepStrictEqual(a, b)) { fails++; if (fails <= 20) console.log("DIFF", label); } };

  const dA = A.buildData(files), dB = B.buildData(files);
  same("buildData", dA, dB);
  const pA = A.fitParams(dA), pB = B.fitParams(dB);
  same("fitParams", pA, pB);
  same("modelError", A.modelError(dA, pA), B.modelError(dB, pB));
  same("fieldTimeline", A.fieldTimeline(dA), B.fieldTimeline(dB));
  for (let t = Date.parse("2026-09-01T00:00:00Z"); t < Date.parse("2027-01-20T00:00:00Z"); t += 3600e3)
    same(`openLeg ${new Date(t).toISOString()}`, A.openLeg(files.actuals.legs, t), B.openLeg(files.actuals.legs, t));

  const burnedSets = [["no picks", {}], ...dA.entries.map((e) => [e.name, e.picks || {}])];
  for (const l of LEGS) {
    same(`availability ${l.id}`, A.availability(l.id, dA), B.availability(l.id, dB));
    for (const [who, picks] of burnedSets)
      for (const style of ["now", "balanced", "future"])
        same(`boardStats ${l.id} ${who} ${style}`, A.boardStats(l.id, dA, pA, picks, style), B.boardStats(l.id, dB, pB, picks, style));
  }
  console.log(`base ${git("rev-parse", "--short", base)} vs working tree on data from ${files.odds.updatedAt}: ${LEGS.length} legs, ${Object.keys(OPP).length} schedules, ${burnedSets.length} burned sets, fit a=${pB.a} b=${pB.b.toFixed(2)}`);
  console.log(`${checks - fails}/${checks} outputs identical`);
} finally {
  git("worktree", "remove", "--force", wt);
}
if (fails) process.exit(1);
