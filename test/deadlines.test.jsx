// Leg deadlines against rules 12 and 13, and the lines pull schedule against the deadlines.
import { readFileSync } from "node:fs";
import { LEGS } from "../src/schedule.js";
let fails = 0; const ok = (name, cond, extra = "") => { console.log(name + ":", cond ? "OK" : "FAIL", extra); if (!cond) fails++; };

const vegas = (iso) => Object.fromEntries(new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", weekday: "short", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
}).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));

const holiday = { TG: ["Wed", "11", "25"], XM: ["Thu", "12", "24"] };
for (const l of LEGS) {
  const v = vegas(l.deadline);
  const [day, month, date] = holiday[l.id] || ["Sat", v.month, v.day];
  ok(`${l.id} locks at 4:00 PM Las Vegas time on ${day} ${month}/${date}`,
    v.weekday === day && v.month === month && v.day === date && v.hour === "16" && v.minute === "00", JSON.stringify(v));
}
for (let i = 1; i < LEGS.length; i++)
  ok(`${LEGS[i].id} locks after ${LEGS[i - 1].id}`, new Date(LEGS[i].deadline) > new Date(LEGS[i - 1].deadline));

const field = (spec, value) => spec === "*" || spec.split(",").some((s) => Number(s) === value);
const fires = (cron, t) => {
  const [min, hour, dom, month, dow] = cron.split(/\s+/);
  const dayOk = dom !== "*" && dow !== "*"
    ? field(dom, t.getUTCDate()) || field(dow, t.getUTCDay())
    : field(dom, t.getUTCDate()) && field(dow, t.getUTCDay());
  return field(min, t.getUTCMinutes()) && field(hour, t.getUTCHours()) && dayOk && field(month, t.getUTCMonth() + 1);
};
const crons = [...readFileSync(".github/workflows/update-data.yml", "utf8").matchAll(/-\s*cron:\s*"([^"]+)"/g)].map((m) => m[1]);
ok("update-data.yml declares a schedule", crons.length > 0, JSON.stringify(crons));

ok("cron matcher reads a known firing", fires("17 14,23 * * *", new Date("2026-09-26T23:17:00Z")) && !fires("17 14,23 * * *", new Date("2026-09-26T22:17:00Z")));
for (const l of LEGS) {
  const lock = new Date(l.deadline).getTime(), hits = [];
  for (let t = lock - 60 * 60e3; t < lock; t += 60e3)
    if (crons.some((c) => fires(c, new Date(t)))) hits.push(new Date(t).toISOString().slice(11, 16));
  ok(`${l.id} gets a lines pull in the hour before its lock`, hits.length > 0, hits.join(" "));
}

if (fails) { console.error(`\n${fails} FAILED`); process.exit(1); }
