// Every outside source these jobs touch can blink: a reset connection, a 502, a rate limit. None of that
// should end a run, because the next scheduled one is at most a few hours away. Retry the blips, give up
// immediately on a real answer like 404, and let callers decide whether a total failure is fatal.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchRetry(url, opts = {}, { tries = 3, base = 1500, label = "" } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, opts);
      if (r.ok || (r.status < 500 && r.status !== 429)) return r;   // 4xx is an answer, not a blip
      last = new Error(`HTTP ${r.status}`);
    } catch (e) { last = e.cause?.code ? new Error(`${e.message} (${e.cause.code})`) : e; }
    if (i < tries - 1) { console.warn(`  retrying${label ? " " + label : ""} after ${last.message}`); await sleep(base * (i + 1)); }
  }
  throw new Error(`${label || url}: ${last.message} after ${tries} tries`);
}

// For probes where "could not reach it" and "not there" mean the same thing to the caller.
export const fetchOrNull = (url, opts, cfg) => fetchRetry(url, opts, cfg).catch((e) => { console.warn("  " + e.message); return null; });
