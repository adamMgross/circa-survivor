// The retry wrapper: blips are retried, real answers are not, exhaustion is reported honestly.
import { fetchRetry, fetchOrNull } from "../scripts/http.mjs";
let fails = 0; const ok = (name, cond, extra = "") => { console.log(name + ":", cond ? "OK" : "FAIL", extra); if (!cond) fails++; };
const real = global.fetch, warn = console.warn; console.warn = () => {};
const script = (...steps) => { let i = 0; const calls = []; global.fetch = async (u) => { calls.push(u); const s = steps[Math.min(i++, steps.length - 1)]; if (s instanceof Error) throw s; return { ok: s < 400, status: s, headers: { get: () => "application/pdf" } }; }; return calls; };
const reset = () => { const e = new Error("fetch failed"); e.cause = { code: "ECONNRESET" }; return e; };
const fast = { base: 1, label: "t" };

(async () => {
  let calls = script(200);
  ok("succeeds first time, one call", (await fetchRetry("u", {}, fast)).status === 200 && calls.length === 1);

  calls = script(reset(), reset(), 200);
  const r = await fetchRetry("u", {}, fast);
  ok("retries a reset connection and recovers", r.status === 200 && calls.length === 3, `${calls.length} calls`);

  calls = script(503, 200);
  ok("retries a 503", (await fetchRetry("u", {}, fast)).status === 200 && calls.length === 2);

  calls = script(429, 200);
  ok("retries a rate limit", (await fetchRetry("u", {}, fast)).status === 200 && calls.length === 2);

  calls = script(404);
  const r404 = await fetchRetry("u", {}, fast);
  ok("does NOT retry a 404 (that is an answer)", r404.status === 404 && calls.length === 1, `${calls.length} calls`);

  calls = script(401);
  ok("does NOT retry a 401 (a bad key will not fix itself)", (await fetchRetry("u", {}, fast)).status === 401 && calls.length === 1);

  calls = script(reset());
  let threw = null; try { await fetchRetry("u", {}, fast); } catch (e) { threw = e; }
  ok("gives up after 3 tries and says why", threw && calls.length === 3 && /ECONNRESET/.test(threw.message) && /3 tries/.test(threw.message), threw?.message);

  calls = script(reset());
  ok("fetchOrNull returns null instead of throwing", (await fetchOrNull("u", {}, fast)) === null);

  calls = script(reset(), reset(), reset(), 200);
  ok("tries is configurable", (await fetchOrNull("u", {}, { ...fast, tries: 2 })) === null && calls.length === 2, `${calls.length} calls`);
  global.fetch = real; console.warn = warn;
  if (fails) { console.log(`${fails} FAILED`); process.exit(1); }
})();
