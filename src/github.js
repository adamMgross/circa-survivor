// Read/write the data files in the GitHub repo. Reads work without a token (public repo);
// writes need a fine-grained personal access token with Contents: read & write on this repo.
export const REPO = "mfe-labs/circa-survivor";
export const BRANCH = "main";
const API = "https://api.github.com";
const hdr = (token) => ({ Accept: "application/vnd.github+json", ...(token ? { Authorization: "Bearer " + token } : {}) });
async function fail(r) {
  const j = await r.json().catch(() => ({}));
  const e = new Error(`GitHub ${r.status}${j.message ? ": " + String(j.message).slice(0, 120) : ""}`);
  e.status = r.status; return e;
}
export async function readFile(path, token) {
  const r = await fetch(`${API}/repos/${REPO}/contents/${path}?ref=${BRANCH}`, { headers: hdr(token), cache: "no-store" });
  if (!r.ok) throw await fail(r);
  const j = await r.json();
  const bytes = Uint8Array.from(atob(j.content.replace(/\s/g, "")), (c) => c.charCodeAt(0));
  return { json: JSON.parse(new TextDecoder().decode(bytes)), sha: j.sha };
}
export async function writeFile(path, obj, sha, token, message) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj, null, 1) + "\n");
  let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
  const content = btoa(bin);
  const put = (s) => fetch(`${API}/repos/${REPO}/contents/${path}`, { method: "PUT", headers: hdr(token), body: JSON.stringify({ message, content, sha: s || undefined, branch: BRANCH }) });
  let r = await put(sha);
  if (r.status === 409 || r.status === 422) { const cur = await readFile(path, token).catch(() => ({ sha: undefined })); r = await put(cur.sha); }
  if (!r.ok) throw await fail(r);
  return (await r.json()).content.sha;
}
export async function whoAmI(token) {
  const r = await fetch(`${API}/user`, { headers: hdr(token), cache: "no-store" });
  if (!r.ok) throw await fail(r);
  return (await r.json()).login;
}
export async function dispatchWorkflow(token, file) {
  const r = await fetch(`${API}/repos/${REPO}/actions/workflows/${file}/dispatches`, { method: "POST", headers: hdr(token), body: JSON.stringify({ ref: BRANCH }) });
  if (!r.ok) throw await fail(r);
}
